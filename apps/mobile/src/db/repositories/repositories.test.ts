import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '@allerguide/core';
import type { StoredDiaryAttachment } from '@/src/db/web-collections';

const store = new Map<string, unknown>();

vi.mock('@/src/db/web-store', () => ({
  loadJson: <T>(key: string, fallback: T): T => (store.get(key) as T | undefined) ?? fallback,
  saveJson: (key: string, value: unknown) => {
    store.set(key, value);
  },
}));

const statements: { sql: string; params: unknown[] }[] = [];
const sqliteProfiles: Profile[] = [];
const sqliteDiary: { id: number; profileId: number }[] = [];

vi.mock('@/src/db/init', () => ({
  getDb: () => ({
    getAllSync<T>(sql: string, params: unknown[] = []): T[] {
      const normalized = sql.toLowerCase();
      if (normalized.includes('from profiles') && normalized.includes('where userid')) {
        return sqliteProfiles.filter((profile) => profile.userId === params[0]) as T[];
      }
      if (normalized.includes('from diary_entries') && normalized.includes('where profileid')) {
        return sqliteDiary.filter((entry) => entry.profileId === params[0]) as T[];
      }
      if (normalized.includes('from app_settings')) {
        return [] as T[];
      }
      return [] as T[];
    },
    getFirstSync<T>(sql: string, params: unknown[] = []): T | null {
      const normalized = sql.toLowerCase();
      if (normalized.includes('from profiles') && normalized.includes('where id =')) {
        const ownerId = normalized.includes('and userid') ? params[1] : undefined;
        return (sqliteProfiles.find(
          (profile) =>
            profile.id === params[0] && (ownerId === undefined || profile.userId === ownerId),
        ) ?? null) as T | null;
      }
      return null;
    },
    runSync(sql: string, params: unknown[] = []) {
      statements.push({ sql, params });
      const normalized = sql.toLowerCase();
      if (normalized.startsWith('delete from profiles')) {
        const index = sqliteProfiles.findIndex(
          (profile) => profile.id === params[0] && profile.userId === params[1],
        );
        if (index >= 0) sqliteProfiles.splice(index, 1);
      }
    },
  }),
}));

describe('nextNumericId', () => {
  it('starts at 1 and increments from the max id', async () => {
    const { nextNumericId } = await import('./next-id');
    expect(nextNumericId([])).toBe(1);
    expect(nextNumericId([{ id: 2 }, { id: 9 }, { id: 4 }])).toBe(10);
  });
});

describe('web repositories', () => {
  beforeEach(() => {
    store.clear();
  });

  it('writes profiles through collections and enforces owner predicates', async () => {
    const { webProfileRepository } = await import('./profile-repository');
    const created = webProfileRepository.insert({
      userId: 7,
      name: 'Анна',
      birthYear: 1990,
      type: 'self',
      allergies: '["milk"]',
      allergyConfirmations: '{}',
      crossReactionAllergies: '["goat-milk"]',
    });

    expect(created?.id).toBe(1);
    expect(webProfileRepository.getById(1, 7)?.crossReactionAllergies).toBe('["goat-milk"]');
    expect(webProfileRepository.getById(1, 8)).toBeNull();
    expect(webProfileRepository.update(1, 8, {
      userId: 8,
      name: 'Hijack',
      birthYear: 1980,
      type: 'self',
      allergies: '[]',
      allergyConfirmations: '{}',
      crossReactionAllergies: '[]',
    })).toBeNull();
    expect(webProfileRepository.getById(1, 7)?.name).toBe('Анна');
  });

  it('cascades attachments and related rows when deleting an owned profile', async () => {
    const { webProfileRepository } = await import('./profile-repository');
    const { webCollections } = await import('@/src/db/web-collections');

    webProfileRepository.insert({
      userId: 7,
      name: 'Owner',
      birthYear: 1990,
      type: 'self',
      allergies: '[]',
      allergyConfirmations: '{}',
      crossReactionAllergies: '[]',
    });
    webCollections.saveDiaryEntries([
      { id: 91, profileId: 1, type: 'Симптомы', details: '{}', createdAt: '2026-01-01T00:00:00.000Z' },
    ]);
    webCollections.saveDiaryAttachments([
      { id: 3, entryId: 91, kind: 'photo', localPath: '/tmp/a.jpg', createdAt: '2026-01-01T00:00:00.000Z' },
    ] satisfies StoredDiaryAttachment[]);
    webCollections.saveScanHistory([
      {
        id: 4,
        profileId: 1,
        mode: 'product',
        input: 'milk',
        verdict: 'ok',
        matches: '[]',
        level: 'low',
        productName: null,
        source: 'manual',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    expect(webProfileRepository.deleteOwned(1, 8)).toBe(false);
    expect(webCollections.getProfiles()).toHaveLength(1);

    expect(webProfileRepository.deleteOwned(1, 7)).toBe(true);
    expect(webCollections.getProfiles()).toEqual([]);
    expect(webCollections.getDiaryEntries()).toEqual([]);
    expect(webCollections.getDiaryAttachments()).toEqual([]);
    expect(webCollections.getScanHistory()).toEqual([]);
  });

  it('inserts and lists diary entries newest first without SQL', async () => {
    const { webDiaryRepository } = await import('./diary-repository');
    webDiaryRepository.insert({
      profileId: 3,
      type: 'Симптомы',
      details: '{"v":1}',
      createdAt: '2026-06-20T10:00:00.000Z',
    });
    webDiaryRepository.insert({
      profileId: 3,
      type: 'Триггер',
      details: '{"v":1}',
      createdAt: '2026-06-20T11:00:00.000Z',
    });

    const listed = webDiaryRepository.listByProfileId(3);
    expect(listed.map((entry) => entry.id)).toEqual([2, 1]);
    webDiaryRepository.update(2, 3, { type: 'Триггер', details: '{"v":2}' });
    expect(webDiaryRepository.getById(2)?.details).toBe('{"v":2}');
    webDiaryRepository.delete(2, 3);
    expect(webDiaryRepository.listByProfileId(3)).toHaveLength(1);
  });

  it('stores scan history and settings as typed collections', async () => {
    const { webScanHistoryRepository } = await import('./scan-history-repository');
    const { webSettingsRepository } = await import('./settings-repository');

    webScanHistoryRepository.insert({
      profileId: 7,
      mode: 'product',
      input: '4601234567890',
      verdict: 'осторожно',
      matches: '[]',
      level: 'high',
      productName: 'Йогурт',
      source: 'barcode',
      createdAt: '2026-06-20T10:00:00.000Z',
    });
    expect(webScanHistoryRepository.listByProfileId(7)[0]?.productName).toBe('Йогурт');
    expect(webScanHistoryRepository.listByProfileId(9)).toEqual([]);

    webSettingsRepository.set('locale', 'ru');
    expect(webSettingsRepository.get('locale')).toBe('ru');
    expect(webSettingsRepository.getAll()).toEqual({ locale: 'ru' });
  });
});

describe('sqlite profile cascade SQL', () => {
  beforeEach(() => {
    statements.length = 0;
    sqliteProfiles.length = 0;
    sqliteDiary.length = 0;
    sqliteProfiles.push({
      id: 1,
      userId: 7,
      name: 'Owner',
      birthYear: 1990,
      type: 'self',
      allergies: '[]',
    });
    sqliteDiary.push({ id: 91, profileId: 1 });
  });

  it('deletes attachments before diary rows for an owned profile', async () => {
    const { sqliteProfileRepository } = await import('./profile-repository');
    expect(sqliteProfileRepository.deleteOwned(1, 8)).toBe(false);
    expect(statements).toEqual([]);

    expect(sqliteProfileRepository.deleteOwned(1, 7)).toBe(true);
    const attachmentIndex = statements.findIndex(({ sql }) =>
      sql.startsWith('DELETE FROM diary_attachments'),
    );
    const diaryIndex = statements.findIndex(({ sql }) =>
      sql.startsWith('DELETE FROM diary_entries'),
    );
    expect(attachmentIndex).toBeGreaterThanOrEqual(0);
    expect(attachmentIndex).toBeLessThan(diaryIndex);
  });
});
