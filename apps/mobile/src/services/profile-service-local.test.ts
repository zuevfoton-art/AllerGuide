import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile, ProfileInput } from '@allerguide/core';

const profiles: Profile[] = [];
const settings: Record<string, string> = {};
const executedStatements: { sql: string; params: unknown[] }[] = [];

const db = {
  getAllSync<T>(sql: string, params: unknown[] = []): T[] {
    const normalized = sql.toLowerCase();
    if (normalized.includes('from profiles') && normalized.includes('where userid =')) {
      return profiles.filter((profile) => profile.userId === params[0]) as T[];
    }
    if (normalized.includes('from diary_entries')) {
      return [{ id: 91 }] as T[];
    }
    return [] as T[];
  },
  getFirstSync<T>(sql: string, params: unknown[] = []): T | null {
    const normalized = sql.toLowerCase();
    if (normalized.includes('from app_settings') && normalized.includes('where key =')) {
      const value = settings[String(params[0])];
      return (value ? { value } : null) as T | null;
    }
    if (normalized.includes('from profiles') && normalized.includes('order by id desc')) {
      const profile = profiles
        .filter((item) => item.userId === params[0])
        .sort((left, right) => right.id - left.id)[0];
      return (profile ?? null) as T | null;
    }
    if (normalized.includes('from profiles') && normalized.includes('where id =')) {
      const ownerId = normalized.includes('and userid =') ? params[1] : undefined;
      const profile = profiles.find(
        (item) => item.id === params[0] && (ownerId === undefined || item.userId === ownerId),
      );
      return (profile ?? null) as T | null;
    }
    return null;
  },
  runSync(sql: string, params: unknown[] = []): void {
    executedStatements.push({ sql, params });
    const normalized = sql.toLowerCase();

    if (normalized.startsWith('insert or replace into app_settings')) {
      settings[String(params[0])] = String(params[1] ?? '');
      return;
    }

    if (normalized.startsWith('insert into profiles')) {
      profiles.push({
        id: Math.max(0, ...profiles.map((profile) => profile.id)) + 1,
        userId: params[0] as number,
        name: params[1] as string,
        birthYear: params[2] as number,
        type: params[3] as Profile['type'],
        allergies: params[4] as string,
        allergyConfirmations: params[5] as string,
        crossReactionAllergies: params[6] as string,
      });
      return;
    }

    if (normalized.startsWith('update profiles')) {
      const profileId = params[7] as number;
      const ownerId = params[8] as number;
      const index = profiles.findIndex(
        (profile) => profile.id === profileId && profile.userId === ownerId,
      );
      if (index < 0) return;
      profiles[index] = {
        ...profiles[index],
        userId: params[0] as number,
        name: params[1] as string,
        birthYear: params[2] as number,
        type: params[3] as Profile['type'],
        allergies: params[4] as string,
        allergyConfirmations: params[5] as string,
        crossReactionAllergies: params[6] as string,
      };
      return;
    }

    if (normalized.startsWith('delete from profiles')) {
      const profileId = params[0] as number;
      const ownerId = params[1] as number;
      const index = profiles.findIndex(
        (profile) => profile.id === profileId && profile.userId === ownerId,
      );
      if (index >= 0) profiles.splice(index, 1);
    }
  },
};

const appState = {
  activeProfileId: null as number | null,
  activeProfile: null as Profile | null,
  setActiveProfile: (profile: Profile | null) => {
    appState.activeProfile = profile;
    appState.activeProfileId = profile?.id ?? null;
  },
};

vi.mock('@/src/constants/features', () => ({ BACKEND_AUTH_ENABLED: false }));
vi.mock('@/src/services/auth-service', () => ({
  getCurrentUserId: () => 7,
  getBackendAuthToken: vi.fn(),
}));
vi.mock('@/src/db/init', () => ({
  getDb: () => db,
  persistDbWrites: vi.fn(async () => undefined),
}));
vi.mock('@/src/store/app-store', () => ({
  useAppStore: { getState: () => appState },
}));
vi.mock('@/src/services/backend-api', () => ({
  backendCreateProfile: vi.fn(),
  backendDeleteProfile: vi.fn(),
  backendUpdateProfile: vi.fn(),
  backendListProfiles: vi.fn(),
  upsertLocalProfile: vi.fn(),
  replaceLocalProfilesForUser: vi.fn(),
}));
vi.mock('@/src/services/analytics-service', () => ({ trackEvent: vi.fn() }));

const validInput: ProfileInput = {
  name: '  Анна  ',
  birthYear: 1990,
  type: 'self',
  allergies: ['milk'],
  crossReactionAllergies: ['goat-milk', 'goat-milk'],
};

describe('profile-service local ownership and persistence', () => {
  beforeEach(() => {
    profiles.length = 0;
    for (const key of Object.keys(settings)) delete settings[key];
    profiles.push(
      {
        id: 1,
        userId: 7,
        name: 'Owner',
        birthYear: 1990,
        type: 'self',
        allergies: '["milk"]',
        crossReactionAllergies: '[]',
      },
      {
        id: 2,
        userId: 8,
        name: 'Other user',
        birthYear: 1985,
        type: 'self',
        allergies: '["egg"]',
        crossReactionAllergies: '[]',
      },
    );
    executedStatements.length = 0;
    appState.activeProfile = null;
    appState.activeProfileId = null;
    vi.clearAllMocks();
  });

  it('does not read or update a profile owned by another local user', async () => {
    const { getProfile, updateProfile } = await import('./profile-service');

    expect(await getProfile(2)).toBeNull();
    expect(await updateProfile(2, validInput)).toBeNull();
    expect(profiles.find((profile) => profile.id === 2)?.name).toBe('Other user');
  });

  it('does not delete another local users profile or related data', async () => {
    const { deleteProfile } = await import('./profile-service');

    await expect(deleteProfile(2)).resolves.toBe(false);
    expect(profiles.some((profile) => profile.id === 2)).toBe(true);
    expect(
      executedStatements.some(({ sql }) => sql.startsWith('DELETE FROM diary_entries')),
    ).toBe(false);
  });

  it('normalizes persisted fields when creating a profile', async () => {
    const { createProfile } = await import('./profile-service');

    const id = await createProfile(validInput);
    const created = profiles.find((profile) => profile.id === id);

    expect(created?.name).toBe('Анна');
    expect(created?.allergies).toBe('["milk"]');
    expect(created?.crossReactionAllergies).toBe('["goat-milk"]');
  });

  it('preserves stored cross-reactions when edit input omits the field', async () => {
    profiles[0]!.crossReactionAllergies = '["goat-milk"]';
    const { updateProfile } = await import('./profile-service');

    const updated = await updateProfile(1, {
      name: 'Owner updated',
      birthYear: 1990,
      type: 'self',
      allergies: ['milk'],
    });

    expect(updated?.name).toBe('Owner updated');
    expect(updated?.crossReactionAllergies).toBe('["goat-milk"]');
  });

  it('deletes diary attachments before deleting an owned profile', async () => {
    const { deleteProfile } = await import('./profile-service');

    await expect(deleteProfile(1)).resolves.toBe(true);
    const attachmentDeleteIndex = executedStatements.findIndex(({ sql }) =>
      sql.startsWith('DELETE FROM diary_attachments'),
    );
    const diaryDeleteIndex = executedStatements.findIndex(({ sql }) =>
      sql.startsWith('DELETE FROM diary_entries'),
    );

    expect(attachmentDeleteIndex).toBeGreaterThanOrEqual(0);
    expect(attachmentDeleteIndex).toBeLessThan(diaryDeleteIndex);
  });
});
