import { describe, expect, it } from 'vitest';
import {
  createSyncPayload,
  filterUserScopedSettings,
  parseSyncPayload,
  validateSyncPayload,
} from './sync';

describe('sync payload', () => {
  it('creates v2 payload with extended entities', () => {
    const payload = createSyncPayload({
      userId: 1,
      profiles: [{ id: 1, userId: 1, name: 'Anna', birthYear: 1990, type: 'self', allergies: '[]' }],
      diaryEntries: [],
      emergencyContacts: [],
      scanHistory: [
        {
          id: 1,
          profileId: 1,
          mode: 'product',
          input: 'milk',
          verdict: 'danger',
          matches: '[]',
          level: 'high',
          productName: null,
          source: 'manual',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      profileSos: [{ profileId: 1, notes: 'EpiPen' }],
      appSettings: { themeMode: 'dark', emergencyNumber: '103' },
    });

    expect(payload.v).toBe(2);
    expect(payload.scanHistory).toHaveLength(1);
    expect(payload.profileSos).toHaveLength(1);
    expect(payload.appSettings?.themeMode).toBe('dark');
  });

  it('parses v1 and v2 payloads', () => {
    const v1 = JSON.stringify({
      v: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      userId: 1,
      profiles: [],
      diaryEntries: [],
      emergencyContacts: [],
    });
    expect(parseSyncPayload(v1)?.v).toBe(1);

    const v2 = JSON.stringify(createSyncPayload({
      userId: 1,
      profiles: [],
      diaryEntries: [],
      emergencyContacts: [],
    }));
    expect(parseSyncPayload(v2)?.v).toBe(2);
  });

  it('validates user id', () => {
    const payload = createSyncPayload({
      userId: 2,
      profiles: [],
      diaryEntries: [],
      emergencyContacts: [],
    });
    expect(validateSyncPayload(payload, 1)).toBe('User mismatch');
    expect(validateSyncPayload(payload, 2)).toBeNull();
  });

  it('filters user scoped settings', () => {
    const filtered = filterUserScopedSettings({
      themeMode: 'dark',
      authUserId: '1',
      unrelated: 'skip',
      'sosPlan:3': 'plan',
    });
    expect(filtered.themeMode).toBe('dark');
    expect(filtered.unrelated).toBeUndefined();
    expect(filtered['sosPlan:3']).toBe('plan');
  });
});
