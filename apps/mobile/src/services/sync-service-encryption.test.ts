import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/src/constants/features', () => ({ CLOUD_SYNC_ENABLED: true }));

vi.mock('@/src/services/auth-service', () => ({
  getCurrentUserId: () => 7,
}));

vi.mock('@/src/services/backend-api', () => ({
  getAuthToken: async () => 'jwt',
}));

vi.mock('@/src/services/backup-crypto', () => ({
  encryptBackup: vi.fn(async () => null),
  decryptBackup: vi.fn(),
  hasRecoveryKey: () => true,
}));

vi.mock('@/src/services/profile-service', () => ({
  listProfiles: () => [],
}));

vi.mock('@/src/services/sos-service', () => ({
  getSosNotes: () => [],
}));

vi.mock('@/src/db/init', () => ({
  getDb: () => ({
    getAllSync: () => [],
  }),
}));

vi.mock('@/src/services/analytics-service', () => ({ trackEvent: vi.fn() }));
vi.mock('@/src/services/error-reporting', () => ({ logCaughtError: vi.fn() }));
vi.mock('@/src/services/reminder-reconcile-service', () => ({
  reconcileAllReminders: vi.fn(),
}));

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('uploadBackup encryption contract', () => {
  it('fails closed instead of uploading plaintext when encryption is unavailable', async () => {
    global.fetch = vi.fn() as unknown as typeof fetch;
    const { uploadBackup } = await import('./sync-service');
    const result = await uploadBackup();
    expect(result).toEqual({
      ok: false,
      error: 'Не удалось зашифровать резервную копию',
      code: 'encryption_unavailable',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
