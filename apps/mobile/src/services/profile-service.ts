import { persistDbWrites } from '@/src/db/init';
import { getProfileRepository } from '@/src/db/repositories';
import { useAppStore } from '@/src/store/app-store';
import { BACKEND_AUTH_ENABLED } from '@/src/constants/features';
import { getCurrentUserId, getBackendAuthToken } from '@/src/services/auth-service';
import {
  backendCreateProfile,
  backendDeleteProfile,
  backendUpdateProfile,
  backendListProfiles,
  upsertLocalProfile,
  replaceLocalProfilesForUser,
} from '@/src/services/backend-api';
import {
  enqueueProfileOutbox,
  isNetworkUnavailableStatus,
} from '@/src/services/profile-outbox-service';
import { trackEvent } from '@/src/services/analytics-service';
import {
  getStoredActiveProfileId,
  setStoredActiveProfileId,
} from '@/src/services/settings-service';
import { apiErrorMessage, resolveApiErrorCode, type ApiErrorCode } from '@/src/services/api-errors';
import {
  dedupeAllergenIds,
  migrateProfileAllergiesJson,
  normalizeAllergyConfirmations,
  parseAllergyConfirmations,
  parseProfileAllergenIds,
  resolvePreferredActiveProfile,
  serializeAllergyConfirmations,
  serializeProfileAllergenIds,
  sortProfilesForDisplay,
  validateProfileInput,
  type Profile,
  type ProfileInput,
  type ProfileType,
  type ProfileValidationErrorCode,
} from '@allerguide/core';

export class ProfileValidationError extends Error {
  code: ProfileValidationErrorCode;

  constructor(code: ProfileValidationErrorCode) {
    super(code);
    this.code = code;
  }
}

export class ProfileServiceError extends Error {
  code: ApiErrorCode | 'not_authenticated';

  constructor(code: ApiErrorCode | 'not_authenticated', message?: string) {
    super(message ?? apiErrorMessage(code === 'not_authenticated' ? 'api_error' : code));
    this.code = code;
  }
}

function requireUserId(): number {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User is not authenticated');
  return userId;
}

type NormalizedProfilePayload = {
  name: string;
  allergenIds: string[];
  allergiesJson: string;
  allergyConfirmationsJson: string;
  crossReactionAllergiesJson: string;
};

function normalizeProfilePayload(input: ProfileInput): NormalizedProfilePayload {
  const allergenIds = dedupeAllergenIds(input.allergies);
  const allergiesJson = serializeProfileAllergenIds(allergenIds);
  const allergyConfirmationsJson = serializeAllergyConfirmations(
    normalizeAllergyConfirmations(allergenIds, input.allergyConfirmations),
  );
  const crossReactionAllergiesJson = serializeProfileAllergenIds(
    dedupeAllergenIds(input.crossReactionAllergies ?? []),
  );

  return {
    name: input.name.trim(),
    allergenIds,
    allergiesJson,
    allergyConfirmationsJson,
    crossReactionAllergiesJson,
  };
}

function assertValidProfileInput(input: ProfileInput) {
  const error = validateProfileInput({
    name: input.name,
    birthYear: input.birthYear,
    type: input.type,
    allergies: input.allergies,
    childConsent: input.childConsent,
    scenario: input.scenario,
  });
  if (error) throw new ProfileValidationError(error);
}

function persistActiveProfile(profile: Profile | null) {
  useAppStore.getState().setActiveProfile(profile);
  setStoredActiveProfileId(profile?.id ?? null);
}

function syncActiveProfileAfterList(profiles: Profile[], options?: { preferSelf?: boolean }) {
  const { activeProfileId } = useAppStore.getState();
  if (profiles.length === 0) {
    persistActiveProfile(null);
    return;
  }

  const preferred = resolvePreferredActiveProfile(profiles);
  const candidateId = activeProfileId ?? getStoredActiveProfileId();
  const keepCurrent =
    !options?.preferSelf &&
    candidateId != null &&
    profiles.some((profile) => profile.id === candidateId);

  const active = keepCurrent
    ? profiles.find((profile) => profile.id === candidateId) ?? preferred
    : preferred;

  persistActiveProfile(active);
}

/** Remember the profile the user picked in the header switcher. */
export function activateProfile(profile: Profile) {
  persistActiveProfile(profile);
}

/**
 * Load profiles for the signed-in user and activate the preferred one
 * (parent / `self` when present). Call on app bootstrap and after login.
 */
export function ensureActiveProfileLoaded(options?: { preferSelf?: boolean }): Profile | null {
  const profiles = listProfiles();
  syncActiveProfileAfterList(profiles, { preferSelf: options?.preferSelf ?? true });
  return useAppStore.getState().activeProfile;
}

/**
 * Keep the profile the user already selected (child or self).
 * Use on screens with a profile switcher — not bootstrap.
 */
export function ensureCurrentProfileLoaded(): Profile | null {
  return ensureActiveProfileLoaded({ preferSelf: false });
}

/** Recover the last selected profile when transient Zustand state is empty (web HMR / tab remount). */
export function getOrLoadActiveProfileId(): number | null {
  const activeProfileId = useAppStore.getState().activeProfileId;
  if (activeProfileId != null) return activeProfileId;
  return ensureCurrentProfileLoaded()?.id ?? null;
}

function throwOnBackendError(response: { ok: false; error: string; status: number }): never {
  const code = resolveApiErrorCode(response.status);
  throw new ProfileServiceError(code, apiErrorMessage(code, response.error));
}

export function listProfiles(): Profile[] {
  const userId = getCurrentUserId();
  if (!userId) return [];

  return sortProfilesForDisplay(getProfileRepository().listByUserId(userId));
}

/** Pull server profiles into local DB (P1.2d). Best-effort; returns error code without throwing. */
export async function refreshProfilesFromBackend(): Promise<
  { ok: true; profiles: Profile[] } | { ok: false; code: ApiErrorCode | 'not_authenticated' }
> {
  if (!BACKEND_AUTH_ENABLED) {
    return { ok: true, profiles: listProfiles() };
  }

  const userId = getCurrentUserId();
  if (!userId) return { ok: false, code: 'not_authenticated' };

  const token = await getBackendAuthToken();
  if (!token) return { ok: false, code: 'session_expired' };

  const response = await backendListProfiles(token);
  if (!response.ok) {
    return { ok: false, code: resolveApiErrorCode(response.status) };
  }

  replaceLocalProfilesForUser(userId, response.data.profiles);
  const profiles = listProfiles();
  syncActiveProfileAfterList(profiles, { preferSelf: false });
  return { ok: true, profiles };
}

export async function createProfile(input: ProfileInput) {
  assertValidProfileInput(input);
  const userId = requireUserId();
  const normalized = normalizeProfilePayload(input);

  if (BACKEND_AUTH_ENABLED) {
    const token = await getBackendAuthToken();
    if (!token) throw new ProfileServiceError('session_expired');

    const queuedInput = {
      ...input,
      name: normalized.name,
      allergies: normalized.allergenIds,
      allergyConfirmations: parseAllergyConfirmations(normalized.allergyConfirmationsJson),
      crossReactionAllergies: parseProfileAllergenIds(normalized.crossReactionAllergiesJson),
    };
    const response = await backendCreateProfile(token, queuedInput);
    if (!response.ok) {
      if (isNetworkUnavailableStatus(response.status)) {
        const localId = insertLocalProfileRow(userId, input, normalized);
        enqueueProfileOutbox({ op: 'create', localId: localId ?? undefined, input: queuedInput });
        await persistDbWrites();
        trackEvent('profile_created', { type: input.type, source: 'local' });
        return localId;
      }
      throwOnBackendError(response);
    }

    const localProfile = {
      ...response.data.profile,
      userId,
      crossReactionAllergies:
        response.data.profile.crossReactionAllergies ?? normalized.crossReactionAllergiesJson,
    };
    upsertLocalProfile(localProfile);
    persistActiveProfile(localProfile);
    await persistDbWrites();
    trackEvent('profile_created', { type: input.type, source: 'backend' });
    return response.data.profile.id;
  }

  const localId = insertLocalProfileRow(userId, input, normalized);
  await persistDbWrites();
  trackEvent('profile_created', { type: input.type, source: 'local' });
  return localId;
}

function insertLocalProfileRow(
  userId: number,
  input: ProfileInput,
  normalized: NormalizedProfilePayload,
): number | null {
  const profile = getProfileRepository().insert({
    userId,
    name: normalized.name,
    birthYear: input.birthYear,
    type: input.type,
    allergies: normalized.allergiesJson,
    allergyConfirmations: normalized.allergyConfirmationsJson,
    crossReactionAllergies: normalized.crossReactionAllergiesJson,
  });
  persistActiveProfile(profile);
  return profile?.id ?? null;
}

export async function updateProfile(id: number, input: ProfileInput) {
  assertValidProfileInput(input);
  const userId = requireUserId();
  const existingProfile = getProfileRepository().getById(id, userId);
  if (!BACKEND_AUTH_ENABLED && !existingProfile) return null;

  const inputWithPreservedCrossReactions =
    input.crossReactionAllergies === undefined && existingProfile?.crossReactionAllergies
      ? {
          ...input,
          crossReactionAllergies: parseProfileAllergenIds(
            existingProfile.crossReactionAllergies,
          ),
        }
      : input;
  const normalized = normalizeProfilePayload(inputWithPreservedCrossReactions);

  if (BACKEND_AUTH_ENABLED) {
    const token = await getBackendAuthToken();
    if (!token) throw new ProfileServiceError('session_expired');

    const queuedInput = {
      ...input,
      name: normalized.name,
      allergies: normalized.allergenIds,
      allergyConfirmations: parseAllergyConfirmations(normalized.allergyConfirmationsJson),
      crossReactionAllergies: parseProfileAllergenIds(normalized.crossReactionAllergiesJson),
    };
    const response = await backendUpdateProfile(token, id, queuedInput);
    if (!response.ok) {
      if (isNetworkUnavailableStatus(response.status)) {
        applyLocalProfileUpdate(id, userId, input, normalized);
        enqueueProfileOutbox({ op: 'update', localId: id, input: queuedInput });
        await persistDbWrites();
        return getProfile(id);
      }
      throwOnBackendError(response);
    }

    const localProfile = {
      ...response.data.profile,
      userId,
      crossReactionAllergies:
        response.data.profile.crossReactionAllergies ?? normalized.crossReactionAllergiesJson,
    };
    upsertLocalProfile(localProfile);
    const { activeProfileId } = useAppStore.getState();
    if (activeProfileId === id) persistActiveProfile(localProfile);
    await persistDbWrites();
    return localProfile;
  }

  const profile = applyLocalProfileUpdate(id, userId, input, normalized);
  await persistDbWrites();
  return profile;
}

function applyLocalProfileUpdate(
  id: number,
  userId: number,
  input: ProfileInput,
  normalized: NormalizedProfilePayload,
): Profile | null {
  const profile = getProfileRepository().update(id, userId, {
    userId,
    name: normalized.name,
    birthYear: input.birthYear,
    type: input.type,
    allergies: normalized.allergiesJson,
    allergyConfirmations: normalized.allergyConfirmationsJson,
    crossReactionAllergies: normalized.crossReactionAllergiesJson,
  });
  const { activeProfileId } = useAppStore.getState();
  if (activeProfileId === id) persistActiveProfile(profile);
  return profile;
}

export async function deleteProfile(id: number) {
  const userId = requireUserId();

  if (BACKEND_AUTH_ENABLED) {
    const token = await getBackendAuthToken();
    if (!token) throw new ProfileServiceError('session_expired');

    const response = await backendDeleteProfile(token, id);
    if (!response.ok) throwOnBackendError(response);
  }

  if (!getProfileRepository().deleteOwned(id, userId)) return false;

  const { activeProfileId } = useAppStore.getState();
  if (activeProfileId === id) {
    syncActiveProfileAfterList(listProfiles(), { preferSelf: true });
  }
  await persistDbWrites();
  return true;
}

export async function getProfile(id: number) {
  const userId = getCurrentUserId();
  if (!userId) return null;

  return getProfileRepository().getById(id, userId);
}

export function countProfilesByType(type: ProfileType) {
  return listProfiles().filter((profile) => profile.type === type).length;
}

export function migrateLegacyProfilesToUser(userId: number) {
  const profiles = getProfileRepository();
  for (const profile of profiles.listAll()) {
    const migratedAllergies = migrateProfileAllergiesJson(profile.allergies);
    const confirmations = profile.allergyConfirmations ?? '{}';
    if (!profile.userId || migratedAllergies !== profile.allergies) {
      profiles.updateLegacy(profile.id, {
        userId: profile.userId || userId,
        name: profile.name,
        birthYear: profile.birthYear,
        type: profile.type,
        allergies: migratedAllergies,
        allergyConfirmations: confirmations,
      });
    }
  }
}
