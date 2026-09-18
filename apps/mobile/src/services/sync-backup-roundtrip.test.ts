import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * End-to-end export → import round-trip with the real `applySyncPayload`, so the
 * restore allowlist is exercised through the same path the Settings screen uses.
 * `sync-service-local.test.ts` stubs the restore out and cannot see it.
 */

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

vi.mock('@/src/services/reminder-reconcile-service', () => ({
  reconcileAllReminders: vi.fn(),
}));

const profiles = [
  { id: 10, userId: 7, name: 'Анна', birthYear: 1990, type: 'self' as const, allergies: '["milk"]' },
];
const diaryEntries = [
  {
    id: 1,
    profileId: 10,
    type: 'Симптомы',
    details: '{"v":1,"answers":{}}',
    createdAt: '2026-06-20T10:00:00.000Z',
  },
];

vi.mock('@/src/services/auth-service', () => ({
  getCurrentUserId: () => 7,
}));

vi.mock('@/src/services/profile-service', () => ({
  listProfiles: () => profiles,
}));

vi.mock('@/src/services/sos-service', () => ({
  getSosNotes: () => [],
}));

const settingsTable = new Map<string, string>();
const writes: { sql: string; params?: unknown[] }[] = [];

vi.mock('@/src/db/init', () => ({
  getDb: () => ({
    getAllSync: (sql: string) => {
      if (sql.includes('FROM app_settings')) {
        return [...settingsTable].map(([key, value]) => ({ key, value }));
      }
      if (sql.includes('FROM diary_entries')) return diaryEntries;
      return [];
    },
    runSync: (sql: string, params?: unknown[]) => {
      writes.push({ sql, params });
      if (sql.includes('app_settings')) {
        settingsTable.set(String(params?.[0]), String(params?.[1]));
      }
    },
  }),
}));

function settingWrites(): string[] {
  return writes
    .filter((write) => write.sql.includes('app_settings'))
    .map((write) => String(write.params?.[0]));
}

beforeEach(() => {
  writes.length = 0;
  settingsTable.clear();
  settingsTable.set('themeMode', 'dark');
  settingsTable.set('emergencyNumber', '103');
  // Present on web, where "secure" settings share the app_settings table.
  settingsTable.set('refreshToken', 'real-session-token');
});

describe('local backup export → import round-trip', () => {
  it('keeps user data and never exports session secrets', async () => {
    const { exportLocalBackup } = await import('./sync-service');
    const parsed = JSON.parse(exportLocalBackup());

    expect(parsed.profiles).toHaveLength(1);
    expect(parsed.diaryEntries).toHaveLength(1);
    expect(parsed.appSettings).toMatchObject({ themeMode: 'dark', emergencyNumber: '103' });
    expect(parsed.appSettings).not.toHaveProperty('refreshToken');
  });

  it('restores the exported file and reapplies its settings', async () => {
    const { exportLocalBackup, importLocalBackup } = await import('./sync-service');
    const raw = exportLocalBackup();

    writes.length = 0;
    expect(importLocalBackup(raw)).toEqual({ ok: true });

    expect(writes.some((write) => write.sql.includes('profiles'))).toBe(true);
    expect(writes.some((write) => write.sql.includes('diary_entries'))).toBe(true);
    expect(settingWrites()).toContain('themeMode');
    expect(settingWrites()).toContain('emergencyNumber');
  });

  it('ignores settings a tampered file adds on top of a genuine export', async () => {
    const { exportLocalBackup, importLocalBackup } = await import('./sync-service');
    const tampered = JSON.parse(exportLocalBackup());
    tampered.appSettings.refreshToken = 'attacker-supplied';
    tampered.appSettings.recoveryKey = 'f'.repeat(64);
    tampered.appSettings.backupSecret = 'attacker-supplied';

    writes.length = 0;
    expect(importLocalBackup(JSON.stringify(tampered))).toEqual({ ok: true });

    expect(settingWrites()).toContain('themeMode');
    expect(settingWrites()).not.toContain('refreshToken');
    expect(settingWrites()).not.toContain('recoveryKey');
    expect(settingWrites()).not.toContain('backupSecret');
    // The genuine session value must survive the restore untouched.
    expect(settingsTable.get('refreshToken')).toBe('real-session-token');
  });
});
