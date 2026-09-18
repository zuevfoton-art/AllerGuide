import { describe, expect, it } from 'vitest';
import { createSyncPayload } from '@allerguide/core';
import { applySyncPayload } from './sync-restore';

describe('applySyncPayload', () => {
  it('writes profiles, diary, contacts, scans, sos and settings', () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const db = {
      runSync: (sql: string, params?: unknown[]) => {
        calls.push({ sql, params });
      },
    };

    const payload = createSyncPayload({
      userId: 7,
      profiles: [{ id: 1, userId: 7, name: 'Anna', birthYear: 1990, type: 'self', allergies: '[]' }],
      diaryEntries: [{ id: 10, profileId: 1, type: 'symptom', details: 'rash', createdAt: '2026-01-01' }],
      emergencyContacts: [{ id: 2, profileId: 1, name: 'Mom', phone: '+7999', relation: 'relative' }],
      scanHistory: [
        {
          id: 3,
          profileId: 1,
          mode: 'product',
          input: 'milk',
          verdict: 'danger',
          matches: '[]',
          level: 'high',
          productName: null,
          source: 'manual',
          createdAt: '2026-01-01',
        },
      ],
      profileSos: [{ profileId: 1, notes: 'EpiPen' }],
      appSettings: { themeMode: 'dark' },
    });

    applySyncPayload(db, payload, 7);

    expect(calls.some((call) => call.sql.toLowerCase().includes('profiles'))).toBe(true);
    expect(calls.some((call) => call.sql.toLowerCase().includes('diary_entries'))).toBe(true);
    expect(calls.some((call) => call.sql.toLowerCase().includes('emergency_contacts'))).toBe(true);
    expect(calls.some((call) => call.sql.toLowerCase().includes('scan_history'))).toBe(true);
    expect(calls.some((call) => call.sql.toLowerCase().includes('profile_sos'))).toBe(true);
    expect(calls.some((call) => call.sql.toLowerCase().includes('app_settings'))).toBe(true);
  });

  it('restores only allowlisted settings keys from an untrusted backup file', () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const db = {
      runSync: (sql: string, params?: unknown[]) => {
        calls.push({ sql, params });
      },
    };

    const payload = createSyncPayload({
      userId: 7,
      profiles: [],
      diaryEntries: [],
      emergencyContacts: [],
      scanHistory: [],
      profileSos: [],
      appSettings: {
        themeMode: 'dark',
        // Keys the export never emits. On web these back "secure" storage.
        refreshToken: 'attacker-supplied',
        recoveryKey: 'f'.repeat(64),
        backupSecret: 'attacker-supplied',
      },
    });

    applySyncPayload(db, payload, 7);

    const settingKeys = calls
      .filter((call) => call.sql.toLowerCase().includes('app_settings'))
      .map((call) => call.params?.[0]);

    expect(settingKeys).toContain('themeMode');
    expect(settingKeys).not.toContain('refreshToken');
    expect(settingKeys).not.toContain('recoveryKey');
    expect(settingKeys).not.toContain('backupSecret');
  });
});
