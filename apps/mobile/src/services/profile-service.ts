import { getDb } from '@/src/db/init';
import { useAppStore } from '@/src/store/app-store';
import { BACKEND_AUTH_ENABLED } from '@/src/constants/features';
import { getCurrentUserId, getBackendAuthToken } from '@/src/services/auth-service';
import {
  backendCreateProfile,
  backendDeleteProfile,
  backendUpdateProfile,
  upsertLocalProfile,
} from '@/src/services/backend-api';
import { trackEvent } from '@/src/services/analytics-service';
import type { Profile, ProfileInput, ProfileType } from '@allerguide/core';
import {
  dedupeAllergenIds,
  migrateProfileAllergiesJson,
  normalizeAllergyConfirmations,
  normalizeProfileAllergenIds,
  parseAllergyConfirmations,
  serializeAllergyConfirmations,
  serializeProfileAllergenIds,
  validateProfileInput,
  type ProfileValidationErrorCode,
} from '@allerguide/core';

export class ProfileValidationError extends Error {
  code: ProfileValidationErrorCode;

  constructor(code: ProfileValidationErrorCode) {
    super(code);
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
  return { allergenIds, allergiesJson, allergyConfirmationsJson };
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

export function listProfiles() {
  const userId = getCurrentUserId();
  if (!userId) return [];

  const db = getDb();
  return db.getAllSync<Profile>('SELECT * FROM profiles WHERE userId = ? ORDER BY id DESC', [userId]);
}

export async function createProfile(input: ProfileInput) {
  assertValidProfileInput(input);
  const userId = requireUserId();
  const { allergenIds, allergiesJson, allergyConfirmationsJson } = normalizeProfilePayload(input);

  if (BACKEND_AUTH_ENABLED) {
    const token = await getBackendAuthToken();
    if (!token) throw new Error('Session expired');

    const response = await backendCreateProfile(token, {
      ...input,
      allergies: allergenIds,
      allergyConfirmations: parseAllergyConfirmations(allergyConfirmationsJson),
    });
    if (!response.ok) throw new Error(response.error);

    upsertLocalProfile({ ...response.data.profile, userId });
    useAppStore.getState().setActiveProfile(response.data.profile);
    trackEvent('profile_created', { type: input.type, source: 'backend' });
    return response.data.profile.id;
  }

  const db = getDb();
  db.runSync(
    'INSERT INTO profiles (userId, name, birthYear, type, allergies, allergyConfirmations) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, input.name, input.birthYear, input.type, allergiesJson, allergyConfirmationsJson],
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
  const { allergenIds, allergiesJson, allergyConfirmationsJson } = normalizeProfilePayload(input);

  if (BACKEND_AUTH_ENABLED) {
    const token = await getBackendAuthToken();
    if (!token) throw new Error('Session expired');

    const response = await backendUpdateProfile(token, id, {
      ...input,
      allergies: allergenIds,
      allergyConfirmations: parseAllergyConfirmations(allergyConfirmationsJson),
    });
    if (!response.ok) throw new Error(response.error);

    upsertLocalProfile({ ...response.data.profile, userId });
    const { activeProfileId, setActiveProfile } = useAppStore.getState();
    if (activeProfileId === id) setActiveProfile(response.data.profile);
    return response.data.profile;
  }

  const db = getDb();
  db.runSync(
    'UPDATE profiles SET userId = ?, name = ?, birthYear = ?, type = ?, allergies = ?, allergyConfirmations = ? WHERE id = ?',
    [userId, input.name, input.birthYear, input.type, allergiesJson, allergyConfirmationsJson, id],
  );
  const profile = db.getFirstSync<Profile>('SELECT * FROM profiles WHERE id = ?', [id]);
  const { activeProfileId, setActiveProfile } = useAppStore.getState();
  if (activeProfileId === id) setActiveProfile(profile || null);
  return profile;
}

export async function deleteProfile(id: number) {
  if (BACKEND_AUTH_ENABLED) {
    const token = await getBackendAuthToken();
    if (token) {
      const response = await backendDeleteProfile(token, id);
      if (!response.ok) throw new Error(response.error);
    }
  }

  const db = getDb();
  db.runSync('DELETE FROM diary_entries WHERE profileId = ?', [id]);
  db.runSync('DELETE FROM scan_history WHERE profileId = ?', [id]);
  db.runSync('DELETE FROM emergency_contacts WHERE profileId = ?', [id]);
  db.runSync('DELETE FROM profile_sos WHERE profileId = ?', [id]);
  db.runSync('DELETE FROM profiles WHERE id = ?', [id]);

  const { activeProfileId, setActiveProfileId, setActiveProfile } = useAppStore.getState();
  if (activeProfileId === id) {
    const remaining = listProfiles();
    const next = remaining[0] ?? null;
    setActiveProfileId(next?.id ?? null);
    setActiveProfile(next);
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
