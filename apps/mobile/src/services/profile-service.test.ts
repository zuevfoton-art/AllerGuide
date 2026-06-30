import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Profile } from '@allerguide/core';

const profiles: Profile[] = [];
let backendListResponse: { ok: true; data: { profiles: Profile[] } } | { ok: false; error: string; status: number } = {
  ok: true,
  data: { profiles: [] },
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
    getState: () => ({
      activeProfileId: null,
      setActiveProfileId: vi.fn(),
      setActiveProfile: vi.fn(),
    }),
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

describe('refreshProfilesFromBackend', () => {
  beforeEach(() => {
    profiles.length = 0;
    backendListResponse = {
      ok: true,
      data: {
        profiles: [
          {
            id: 1,
            userId: 7,
            name: 'Anna',
            birthYear: 1990,
            type: 'self',
            allergies: '[]',
          },
        ],
      },
    };
  });

  it('merges server profiles into local list', async () => {
    const { refreshProfilesFromBackend } = await import('./profile-service');
    const result = await refreshProfilesFromBackend();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profiles).toHaveLength(1);
      expect(result.profiles[0].name).toBe('Anna');
    }
  });

  it('returns network_unavailable on connection failure', async () => {
    backendListResponse = { ok: false, error: 'fail', status: 0 };
    const { refreshProfilesFromBackend } = await import('./profile-service');
    const result = await refreshProfilesFromBackend();
    expect(result).toEqual({ ok: false, code: 'network_unavailable' });
  });
});
