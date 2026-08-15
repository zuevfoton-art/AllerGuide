import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '@allerguide/core';

const store = new Map<string, unknown>();

vi.mock('@/src/db/web-store', () => ({
  hydrateWebStore: vi.fn(async () => undefined),
  loadJson: <T>(key: string, fallback: T): T => (store.get(key) as T | undefined) ?? fallback,
  saveJson: (key: string, value: unknown) => {
    store.set(key, value);
  },
}));

describe('WebDb profile persistence', () => {
  beforeEach(() => {
    store.clear();
  });

  it('persists cross-reaction allergies on insert and update', async () => {
    const { getDb } = await import('./init');
    const db = getDb();

    db.runSync(
      'INSERT INTO profiles (userId, name, birthYear, type, allergies, allergyConfirmations, crossReactionAllergies) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [7, 'Анна', 1990, 'self', '["milk"]', '{"milk":"clinician"}', '["goat-milk"]'],
    );
    const inserted = db.getFirstSync<Profile>(
      'SELECT * FROM profiles WHERE id = ? AND userId = ?',
      [1, 7],
    );
    expect(inserted?.crossReactionAllergies).toBe('["goat-milk"]');

    db.runSync(
      'UPDATE profiles SET userId = ?, name = ?, birthYear = ?, type = ?, allergies = ?, allergyConfirmations = ?, crossReactionAllergies = ? WHERE id = ? AND userId = ?',
      [7, 'Анна', 1990, 'self', '["milk"]', '{"milk":"clinician"}', '["soy"]', 1, 7],
    );
    const updated = db.getFirstSync<Profile>(
      'SELECT * FROM profiles WHERE id = ? AND userId = ?',
      [1, 7],
    );
    expect(updated?.crossReactionAllergies).toBe('["soy"]');
  });

  it('enforces owner predicates for profile updates and deletes', async () => {
    const { getDb } = await import('./init');
    const db = getDb();

    db.runSync(
      'INSERT INTO profiles (userId, name, birthYear, type, allergies, allergyConfirmations, crossReactionAllergies) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [8, 'Другой пользователь', 1980, 'self', '["egg"]', '{}', '[]'],
    );
    db.runSync(
      'UPDATE profiles SET userId = ?, name = ?, birthYear = ?, type = ?, allergies = ?, allergyConfirmations = ?, crossReactionAllergies = ? WHERE id = ? AND userId = ?',
      [7, 'Перезаписано', 1990, 'self', '["milk"]', '{}', '[]', 1, 7],
    );
    db.runSync('DELETE FROM profiles WHERE id = ? AND userId = ?', [1, 7]);

    const profile = db.getFirstSync<Profile>(
      'SELECT * FROM profiles WHERE id = ? AND userId = ?',
      [1, 8],
    );
    expect(profile?.name).toBe('Другой пользователь');
  });
});
