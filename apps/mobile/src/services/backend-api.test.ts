import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiRequest = vi.fn();
const getAllSync = vi.fn();
const runSync = vi.fn();
const logCaughtError = vi.fn();

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn().mockResolvedValue(null),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/src/services/api-client', () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

vi.mock('@/src/db/init', () => ({
  getDb: () => ({
    getAllSync,
    runSync,
  }),
}));

vi.mock('@/src/services/error-reporting', () => ({
  logCaughtError: (...args: unknown[]) => logCaughtError(...args),
}));

describe('syncProfilesFromBackend', () => {
  beforeEach(() => {
    apiRequest.mockReset();
    getAllSync.mockReset();
    runSync.mockReset();
    logCaughtError.mockReset();
    vi.resetModules();
  });

  it('returns backend failures without throwing', async () => {
    apiRequest.mockResolvedValue({ ok: false, error: 'backend unavailable', status: 503 });

    const { syncProfilesFromBackend } = await import('./backend-api');
    await expect(syncProfilesFromBackend(42, 'jwt-token')).resolves.toEqual({
      ok: false,
      error: 'backend unavailable',
      status: 503,
    });

    expect(logCaughtError).toHaveBeenCalledWith(
      'syncProfilesFromBackend.backendListProfiles',
      expect.any(Error),
      expect.objectContaining({ level: 'warn' }),
    );
  });

  it('downgrades local profile replace exceptions into a non-fatal response', async () => {
    apiRequest.mockResolvedValue({
      ok: true,
      data: {
        profiles: [
          {
            id: 7,
            userId: 42,
            name: 'Test',
            birthYear: 2020,
            type: 'child',
            allergies: '[]',
          } as any,
        ],
      },
    });
    getAllSync.mockImplementation(() => {
      throw new Error('db locked');
    });

    const { syncProfilesFromBackend } = await import('./backend-api');
    await expect(syncProfilesFromBackend(42, 'jwt-token')).resolves.toEqual({
      ok: false,
      error: 'Local profile sync failed',
      status: 0,
    });

    expect(logCaughtError).toHaveBeenCalledWith(
      'syncProfilesFromBackend.replaceLocalProfilesForUser',
      expect.any(Error),
      expect.objectContaining({ level: 'warn' }),
    );
  });
});
