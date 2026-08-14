import { getDb } from '@/src/db/init';
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
import { trackEvent } from '@/src/services/analytics-service';
import { apiErrorMessage, resolveApiErrorCode, type ApiErrorCode } from '@/src/services/api-errors';
import {
  dedupeAllergenIds,
  migrateProfileAllergiesJson,
  normalizeAllergyConfirmations,
  parseAllergyConfirmations,
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

function normalizeProfilePayload(input: ProfileInput) {
  const allergenIds = dedupeAllergenIds(input.allergies);
  const allergiesJson = serializeProfileAllergenIds(allergenIds);
  const allergyConfirmationsJson = serializeAllergyConfirmations(
    normalizeAllergyConfirmations(allergenIds, input.allergyConfirmations),
  );
  const crossReactionAllergiesJson = JSON.stringify(
    [...new Set(input.crossReactionAllergies ?? [])],
  );
  return { allergenIds, allergiesJson, allergyConfirmationsJson, crossReactionAllergiesJson };
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

function syncActiveProfileAfterList(profiles: Profile[], options?: { preferSelf?: boolean }) {
  const { activeProfileId, setActiveProfile } = useAppStore.getState();
  if (profiles.length === 0) {
    setActiveProfile(null);
    return;
  }

  const preferred = resolvePreferredActiveProfile(profiles);
  const keepCurrent =
    !options?.preferSelf &&
    activeProfileId != null &&
    profiles.some((profile) => profile.id === activeProfileId);

  const active = keepCurrent
    ? profiles.find((profile) => profile.id === activeProfileId) ?? preferred
    : preferred;

  setActiveProfile(active);
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

/** Recover the persisted active profile after HMR / web reload when Zustand is empty. */
export function getOrLoadActiveProfileId(): number | null {
  const activeProfileId = useAppStore.getState().activeProfileId;
  if (activeProfileId != null) return activeProfileId;
  return ensureActiveProfileLoaded({ preferSelf: true })?.id ?? null;
}

function throwOnBackendError(response: { ok: false; error: string; status: number }): never {
  const code = resolveApiErrorCode(response.status);
  throw new ProfileServiceError(code, apiErrorMessage(code, response.error));
}

export function listProfiles() {
  const userId = getCurrentUserId();
  if (!userId) return [];

  const db = getDb();
  const rows = db.getAllSync<Profile>(
    'SELECT * FROM profiles WHERE userId = ? ORDER BY id ASC',
    [userId],
  );
  return sortProfilesForDisplay(rows);
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
  syncActiveProfileAfterList(profiles, { preferSelf: true });
  return { ok: true, profiles };
}

export async function createProfile(input: ProfileInput) {
  assertValidProfileInput(input);
  const userId = requireUserId();
  const { allergenIds, allergiesJson, allergyConfirmationsJson, crossReactionAllergiesJson } =
    normalizeProfilePayload(input);

  if (BACKEND_AUTH_ENABLED) {
    const token = await getBackendAuthToken();
    if (!token) throw new ProfileServiceError('session_expired');

    const response = await backendCreateProfile(token, {
      ...input,
      allergies: allergenIds,
      allergyConfirmations: parseAllergyConfirmations(allergyConfirmationsJson),
    });
    if (!response.ok) throwOnBackendError(response);

    upsertLocalProfile({ ...response.data.profile, userId });
    useAppStore.getState().setActiveProfile(response.data.profile);
    trackEvent('profile_created', { type: input.type, source: 'backend' });
    return response.data.profile.id;
  }

  const db = getDb();
  db.runSync(
    'INSERT INTO profiles (userId, name, birthYear, type, allergies, allergyConfirmations, crossReactionAllergies) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      userId,
      input.name,
      input.birthYear,
      input.type,
      allergiesJson,
      allergyConfirmationsJson,
      crossReactionAllergiesJson,
    ],
  );
  const row = db.getFirstSync<{ id: number }>('SELECT id FROM profiles ORDER BY id DESC LIMIT 1');
  if (!row?.id) return null;
  const profile = db.getFirstSync<Profile>('SELECT * FROM profiles WHERE id = ?', [row.id]);
  useAppStore.getState().setActiveProfile(profile || null);
  trackEvent('profile_created', { type: input.type, source: 'local' });
  return row.id;
}

export async function updateProfile(id: number, input: ProfileInput) {
  assertValidProfileInput(input);
  const userId = requireUserId();
  const { allergenIds, allergiesJson, allergyConfirmationsJson, crossReactionAllergiesJson } =
    normalizeProfilePayload(input);

  if (BACKEND_AUTH_ENABLED) {
    const token = await getBackendAuthToken();
    if (!token) throw new ProfileServiceError('session_expired');

    const response = await backendUpdateProfile(token, id, {
      ...input,
      allergies: allergenIds,
      allergyConfirmations: parseAllergyConfirmations(allergyConfirmationsJson),
    });
    if (!response.ok) throwOnBackendError(response);

    upsertLocalProfile({ ...response.data.profile, userId });
    const { activeProfileId, setActiveProfile } = useAppStore.getState();
    if (activeProfileId === id) setActiveProfile(response.data.profile);
    return response.data.profile;
  }

  const db = getDb();
  db.runSync(
    'UPDATE profiles SET userId = ?, name = ?, birthYear = ?, type = ?, allergies = ?, allergyConfirmations = ?, crossReactionAllergies = ? WHERE id = ?',
    [
      userId,
      input.name,
      input.birthYear,
      input.type,
      allergiesJson,
      allergyConfirmationsJson,
      crossReactionAllergiesJson,
      id,
    ],
  );
  const profile = db.getFirstSync<Profile>('SELECT * FROM profiles WHERE id = ?', [id]);
  const { activeProfileId, setActiveProfile } = useAppStore.getState();
  if (activeProfileId === id) setActiveProfile(profile || null);
  return profile;
}

export async function deleteProfile(id: number) {
  if (BACKEND_AUTH_ENABLED) {
    const token = await getBackendAuthToken();
    if (!token) throw new ProfileServiceError('session_expired');

    const response = await backendDeleteProfile(token, id);
    if (!response.ok) throwOnBackendError(response);
  }

  const db = getDb();
  db.runSync('DELETE FROM diary_entries WHERE profileId = ?', [id]);
  db.runSync('DELETE FROM scan_history WHERE profileId = ?', [id]);
  db.runSync('DELETE FROM emergency_contacts WHERE profileId = ?', [id]);
  db.runSync('DELETE FROM profile_sos WHERE profileId = ?', [id]);
  db.runSync('DELETE FROM safe_products WHERE profileId = ?', [id]);
  db.runSync('DELETE FROM profiles WHERE id = ?', [id]);

  const { activeProfileId } = useAppStore.getState();
  if (activeProfileId === id) {
    syncActiveProfileAfterList(listProfiles(), { preferSelf: true });
  }
}

export async function getProfile(id: number) {
  const userId = getCurrentUserId();
  if (!userId) return null;

  const db = getDb();
  const profile = db.getFirstSync<Profile>('SELECT * FROM profiles WHERE id = ?', [id]);
  if (!profile || profile.userId !== userId) return null;
  return profile;
}

export function countProfilesByType(type: ProfileType) {
  return listProfiles().filter((profile) => profile.type === type).length;
}

export function migrateLegacyProfilesToUser(userId: number) {
  const db = getDb();
  const all = db.getAllSync<Profile>('SELECT * FROM profiles');
  for (const profile of all) {
    const migratedAllergies = migrateProfileAllergiesJson(profile.allergies);
    const confirmations = profile.allergyConfirmations ?? '{}';
    if (!profile.userId || migratedAllergies !== profile.allergies) {
      db.runSync(
        'UPDATE profiles SET userId = ?, name = ?, birthYear = ?, type = ?, allergies = ?, allergyConfirmations = ? WHERE id = ?',
        [
          profile.userId || userId,
          profile.name,
          profile.birthYear,
          profile.type,
          migratedAllergies,
          confirmations,
          profile.id,
        ],
      );
    }
  }
}
