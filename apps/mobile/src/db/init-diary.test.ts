import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DiaryEntry } from '@allerguide/core';

const store = new Map<string, unknown>();

vi.mock('@/src/db/web-store', () => ({
  hydrateWebStore: vi.fn(async () => undefined),
  loadJson: <T>(key: string, fallback: T): T => (store.get(key) as T | undefined) ?? fallback,
  saveJson: (key: string, value: unknown) => {
    store.set(key, value);
  },
}));

describe('WebDb diary ownership predicates', () => {
  beforeEach(() => {
    store.clear();
  });

  it('updates and deletes only when entry and profile ids match', async () => {
    const { getDb } = await import('./init');
    const db = getDb();

    db.runSync(
      'INSERT INTO diary_entries (profileId, type, details, createdAt) VALUES (?, ?, ?, ?)',
      [8, 'Заметка', 'private', '2026-08-14T08:00:00.000Z'],
    );

    db.runSync(
      'UPDATE diary_entries SET type = ?, details = ? WHERE id = ? AND profileId = ?',
      ['Заметка', 'changed', 1, 7],
    );
    db.runSync('DELETE FROM diary_entries WHERE id = ? AND profileId = ?', [1, 7]);

    const untouched = db.getFirstSync<DiaryEntry>(
      'SELECT * FROM diary_entries WHERE id = ?',
      [1],
    );
    expect(untouched).toMatchObject({ profileId: 8, details: 'private' });

    db.runSync('DELETE FROM diary_entries WHERE id = ? AND profileId = ?', [1, 8]);
    expect(
      db.getFirstSync<DiaryEntry>('SELECT * FROM diary_entries WHERE id = ?', [1]),
    ).toBeNull();
  });
});
