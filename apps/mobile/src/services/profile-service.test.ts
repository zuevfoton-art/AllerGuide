import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Profile } from '@allerguide/core';

const profiles: Profile[] = [];
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
    runSync: vi.fn(),
    getFirstSync: vi.fn(),
  }),
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
});
