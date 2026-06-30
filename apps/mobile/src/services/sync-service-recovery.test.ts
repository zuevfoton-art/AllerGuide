import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSyncPayload } from '@allerguide/core';

const {
  mockGetCurrentUserId,
  mockGetAuthToken,
  mockHasRecoveryKey,
  mockDecryptBackup,
  mockSetRecoveryKey,
  mockMarkRecoveryKeyConfirmed,
  mockListProfiles,
  mockApplySyncPayload,
  mockFetch,
} = vi.hoisted(() => ({
  mockGetCurrentUserId: vi.fn(),
  mockGetAuthToken: vi.fn(),
  mockHasRecoveryKey: vi.fn(),
  mockDecryptBackup: vi.fn(),
  mockSetRecoveryKey: vi.fn(),
  mockMarkRecoveryKeyConfirmed: vi.fn(),
  mockListProfiles: vi.fn(),
  mockApplySyncPayload: vi.fn(),
  mockFetch: vi.fn(),
}));

vi.mock('@/src/services/auth-service', () => ({
  getCurrentUserId: mockGetCurrentUserId,
}));

vi.mock('@/src/services/backend-api', () => ({
  getAuthToken: mockGetAuthToken,
}));

vi.mock('@/src/services/backup-crypto', () => ({
  hasRecoveryKey: mockHasRecoveryKey,
  decryptBackup: mockDecryptBackup,
  setRecoveryKey: mockSetRecoveryKey,
  markRecoveryKeyConfirmed: mockMarkRecoveryKeyConfirmed,
  encryptBackup: vi.fn(),
}));

vi.mock('@/src/services/profile-service', () => ({
  listProfiles: mockListProfiles,
}));

vi.mock('@/src/services/sos-service', () => ({
  getSosNotes: () => [],
}));

vi.mock('@/src/db/init', () => ({
  getDb: () => ({
    getAllSync: () => [],
  }),
}));

vi.mock('@/src/services/sync-restore', () => ({
  applySyncPayload: mockApplySyncPayload,
}));

vi.mock('@/src/services/reminder-reconcile-service', () => ({
  reconcileAllReminders: vi.fn(),
}));

vi.mock('@/src/constants/features', () => ({
  CLOUD_SYNC_ENABLED: true,
}));

const VALID_PAYLOAD = JSON.stringify(
  createSyncPayload({
    userId: 7,
    profiles: [],
    diaryEntries: [],
    emergencyContacts: [],
  }),
);

describe('downloadBackup recovery key', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUserId.mockReturnValue(7);
    mockGetAuthToken.mockResolvedValue('token');
    mockHasRecoveryKey.mockReturnValue(false);
    mockListProfiles.mockReturnValue([]);
    mockSetRecoveryKey.mockReturnValue({ ok: true });
    mockDecryptBackup.mockResolvedValue(VALID_PAYLOAD);
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          encrypted: true,
          payload: 'cipher-envelope',
        }),
    });
    global.fetch = mockFetch as typeof fetch;
  });

  it('returns recovery_key_required when no local key and no key provided', async () => {
    const { downloadBackup } = await import('./sync-service');
    const result = await downloadBackup();
    expect(result).toEqual({
      ok: false,
      error: 'Введите ключ восстановления с другого устройства',
      code: 'recovery_key_required',
    });
  });

  it('returns wrong_recovery_key when decrypt fails', async () => {
    mockDecryptBackup.mockResolvedValue(null);
    const { downloadBackup } = await import('./sync-service');
    const result = await downloadBackup({ recoveryKey: 'a'.repeat(64) });
    expect(result).toEqual({
      ok: false,
      error: 'Неверный ключ восстановления',
      code: 'wrong_recovery_key',
    });
  });

  it('returns sync_disabled when server returns 503', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 });
    const { uploadBackup } = await import('./sync-service');
    const result = await uploadBackup();
    expect(result).toEqual({
      ok: false,
      error: 'Облачная синхронизация пока недоступна',
      code: 'sync_disabled',
    });
  });

  it('persists recovery key and applies payload on success', async () => {
    const { downloadBackup } = await import('./sync-service');
    const key = 'b'.repeat(64);
    const result = await downloadBackup({ recoveryKey: key });
    expect(result).toEqual({ ok: true });
    expect(mockSetRecoveryKey).toHaveBeenCalledWith(key);
    expect(mockMarkRecoveryKeyConfirmed).toHaveBeenCalled();
    expect(mockApplySyncPayload).toHaveBeenCalled();
  });
});
