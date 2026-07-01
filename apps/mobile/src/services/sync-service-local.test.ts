import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSyncPayload } from '@allerguide/core';

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

vi.mock('@/src/services/backup-crypto', () => ({
  encryptBackup: vi.fn(),
  decryptBackup: vi.fn(),
  hasRecoveryKey: vi.fn(),
  setRecoveryKey: vi.fn(),
  markRecoveryKeyConfirmed: vi.fn(),
}));

vi.mock('@/src/services/backend-api', () => ({
  getAuthToken: vi.fn(),
}));

const mockGetCurrentUserId = vi.fn();
const mockApplySyncPayload = vi.fn();
const mockReconcile = vi.fn();

const profiles = [{ id: 10, userId: 7, name: 'Test', birthYear: 1990, type: 'self' as const, allergies: '[]' }];
const diaryEntries = [
  { id: 1, profileId: 10, type: 'Симптомы', details: '{"v":1,"answers":{}}', createdAt: '2026-06-20T10:00:00.000Z' },
];

vi.mock('@/src/services/auth-service', () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
}));

vi.mock('@/src/services/profile-service', () => ({
  listProfiles: () => profiles,
}));

vi.mock('@/src/services/sos-service', () => ({
  getSosNotes: () => [],
}));

vi.mock('@/src/services/sync-restore', () => ({
  applySyncPayload: (...args: unknown[]) => mockApplySyncPayload(...args),
}));

vi.mock('@/src/services/reminder-reconcile-service', () => ({
  reconcileAllReminders: () => mockReconcile(),
}));

vi.mock('@/src/db/init', () => ({
  getDb: () => ({
    getAllSync: (sql: string, params?: unknown[]) => {
      if (sql.includes('FROM app_settings')) return [];
      if (sql.includes('FROM diary_entries')) return diaryEntries;
      if (sql.includes('FROM emergency_contacts')) return [];
      if (sql.includes('FROM scan_history')) return [];
      if (params) return [];
      return [];
    },
  }),
}));

describe('sync-service local backup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUserId.mockReturnValue(7);
  });

  it('exports JSON backup for authenticated user', async () => {
    const { exportLocalBackup } = await import('./sync-service');
    const raw = exportLocalBackup();
    const parsed = JSON.parse(raw);

    expect(parsed.v).toBe(2);
    expect(parsed.userId).toBe(7);
    expect(parsed.profiles).toHaveLength(1);
    expect(parsed.diaryEntries).toHaveLength(1);
  });

  it('rejects export when user is not authenticated', async () => {
    mockGetCurrentUserId.mockReturnValue(null);
    const { exportLocalBackup } = await import('./sync-service');
    expect(() => exportLocalBackup()).toThrow('User is not authenticated');
  });

  it('imports valid local backup for current user', async () => {
    const payload = createSyncPayload({
      userId: 7,
      profiles,
      diaryEntries,
      emergencyContacts: [],
    });

    const { importLocalBackup } = await import('./sync-service');
    const result = importLocalBackup(JSON.stringify(payload));

    expect(result).toEqual({ ok: true });
    expect(mockApplySyncPayload).toHaveBeenCalled();
    expect(mockReconcile).toHaveBeenCalled();
  });

  it('rejects backup for another account', async () => {
    const payload = createSyncPayload({
      userId: 99,
      profiles: [{ ...profiles[0], userId: 99 }],
      diaryEntries: [],
      emergencyContacts: [],
    });

    const { importLocalBackup } = await import('./sync-service');
    const result = importLocalBackup(JSON.stringify(payload));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('не подходит');
    }
  });
});
