import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Profile } from '@allerguide/core';

const profiles: Profile[] = [];
const settings: Record<string, string> = {};
let backendListResponse: { ok: true; data: { profiles: Profile[] } } | { ok: false; error: string; status: number } = {
  ok: true,
  data: { profiles: [] },
};

const appState = {
  activeProfileId: null as number | null,
  activeProfile: null as Profile | null,
  setActiveProfileId: (id: number | null) => {
    appState.activeProfileId = id;
  },
  setActiveProfile: (profile: Profile | null) => {
    appState.activeProfile = profile;
    appState.activeProfileId = profile?.id ?? null;
  },
};

vi.mock('@/src/constants/features', () => ({ BACKEND_AUTH_ENABLED: true }));

vi.mock('@/src/services/auth-service', () => ({
  getCurrentUserId: () => 7,
  getBackendAuthToken: async () => 'jwt',
}));

vi.mock('@/src/services/backend-api', () => ({
  backendListProfiles: async () => backendListResponse,
  replaceLocalProfilesForUser: (userId: number, items: Profile[]) => {
    profiles.length = 0;
    for (const p of items) profiles.push({ ...p, userId });
  },
  backendCreateProfile: vi.fn(),
  backendUpdateProfile: vi.fn(),
  backendDeleteProfile: vi.fn(),
  upsertLocalProfile: vi.fn(),
}));

vi.mock('@/src/store/app-store', () => ({
  useAppStore: {
    getState: () => appState,
  },
}));

vi.mock('@/src/db/init', () => ({
  getDb: () => ({
    getAllSync: () => profiles.filter((p) => p.userId === 7),
    runSync: (sql: string, params: unknown[] = []) => {
      if (sql.toLowerCase().includes('app_settings')) {
        settings[String(params[0])] = String(params[1] ?? '');
      }
    },
    getFirstSync: (sql: string, params: unknown[] = []) => {
      if (sql.toLowerCase().includes('app_settings')) {
        const value = settings[String(params[0])];
        return value ? { value } : null;
      }
      return null;
    },
  }),
  persistDbWrites: vi.fn(async () => undefined),
}));

vi.mock('@/src/services/analytics-service', () => ({ trackEvent: vi.fn() }));

const selfProfile: Profile = {
  id: 2,
  userId: 7,
  name: 'Parent',
  birthYear: 1990,
  type: 'self',
  allergies: '[]',
};

const childProfile: Profile = {
  id: 1,
  userId: 7,
  name: 'Child',
  birthYear: 2018,
  type: 'child',
  allergies: '["milk"]',
};

describe('refreshProfilesFromBackend', () => {
  beforeEach(() => {
    profiles.length = 0;
    for (const key of Object.keys(settings)) delete settings[key];
    appState.activeProfileId = null;
    appState.activeProfile = null;
    backendListResponse = {
      ok: true,
      data: {
        profiles: [selfProfile],
      },
    };
    vi.resetModules();
  });

  it('merges server profiles into local list', async () => {
    const { refreshProfilesFromBackend } = await import('./profile-service');
    const result = await refreshProfilesFromBackend();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profiles).toHaveLength(1);
      expect(result.profiles[0].name).toBe('Parent');
    }
  });

  it('returns network_unavailable on connection failure', async () => {
    backendListResponse = { ok: false, error: 'fail', status: 0 };
    const { refreshProfilesFromBackend } = await import('./profile-service');
    const result = await refreshProfilesFromBackend();
    expect(result).toEqual({ ok: false, code: 'network_unavailable' });
  });

  it('activates parent when parent and child are pulled', async () => {
    backendListResponse = {
      ok: true,
      data: { profiles: [childProfile, selfProfile] },
    };
    const { refreshProfilesFromBackend } = await import('./profile-service');
    const result = await refreshProfilesFromBackend();
    expect(result.ok).toBe(true);
    expect(appState.activeProfileId).toBe(selfProfile.id);
    expect(appState.activeProfile?.type).toBe('self');
  });
});

describe('ensureActiveProfileLoaded', () => {
  beforeEach(() => {
    profiles.length = 0;
    profiles.push(childProfile, selfProfile);
    for (const key of Object.keys(settings)) delete settings[key];
    appState.activeProfileId = null;
    appState.activeProfile = null;
    vi.resetModules();
  });

  it('activates self/parent and loads full profile into the store', async () => {
    const { ensureActiveProfileLoaded } = await import('./profile-service');
    const active = ensureActiveProfileLoaded({ preferSelf: true });
    expect(active?.id).toBe(selfProfile.id);
    expect(appState.activeProfileId).toBe(selfProfile.id);
    expect(appState.activeProfile).toEqual(selfProfile);
  });

  it('keeps current child when preferSelf is false', async () => {
    appState.activeProfileId = childProfile.id;
    appState.activeProfile = childProfile;
    const { ensureActiveProfileLoaded } = await import('./profile-service');
    const active = ensureActiveProfileLoaded({ preferSelf: false });
    expect(active?.id).toBe(childProfile.id);
  });

  it('default preferSelf snaps a selected child back to parent', async () => {
    appState.activeProfileId = childProfile.id;
    appState.activeProfile = childProfile;
    const { ensureActiveProfileLoaded } = await import('./profile-service');
    const active = ensureActiveProfileLoaded();
    expect(active?.id).toBe(selfProfile.id);
    expect(appState.activeProfileId).toBe(selfProfile.id);
  });

  it('ensureCurrentProfileLoaded keeps a selected child', async () => {
    appState.activeProfileId = childProfile.id;
    appState.activeProfile = childProfile;
    const { ensureCurrentProfileLoaded } = await import('./profile-service');
    const active = ensureCurrentProfileLoaded();
    expect(active?.id).toBe(childProfile.id);
    expect(appState.activeProfile).toEqual(childProfile);
  });

  it('restores a stored child when Zustand is empty', async () => {
    settings.activeProfileId = String(childProfile.id);
    const { ensureCurrentProfileLoaded } = await import('./profile-service');
    const active = ensureCurrentProfileLoaded();
    expect(active?.id).toBe(childProfile.id);
    expect(appState.activeProfileId).toBe(childProfile.id);
  });

  it('activateProfile writes the selection for later recovery', async () => {
    const { activateProfile, ensureCurrentProfileLoaded } = await import('./profile-service');
    activateProfile(childProfile);
    expect(settings.activeProfileId).toBe(String(childProfile.id));

    appState.activeProfileId = null;
    appState.activeProfile = null;
    const restored = ensureCurrentProfileLoaded();
    expect(restored?.id).toBe(childProfile.id);
  });

  it('recovers a persisted profile id when transient app state is empty', async () => {
    const { getOrLoadActiveProfileId } = await import('./profile-service');

    expect(getOrLoadActiveProfileId()).toBe(selfProfile.id);
    expect(appState.activeProfile).toEqual(selfProfile);
  });

  it('preserves an already selected profile id', async () => {
    appState.activeProfileId = childProfile.id;
    appState.activeProfile = childProfile;
    const { getOrLoadActiveProfileId } = await import('./profile-service');

    expect(getOrLoadActiveProfileId()).toBe(childProfile.id);
    expect(appState.activeProfile).toEqual(childProfile);
  });
});
