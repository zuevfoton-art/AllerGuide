import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();

vi.mock('@/src/db/web-store', () => ({
  flushWebStore: vi.fn(async () => undefined),
  hydrateWebStore: vi.fn(async () => undefined),
  loadJson: <T>(key: string, fallback: T): T => (store.get(key) as T | undefined) ?? fallback,
  saveJson: (key: string, value: unknown) => {
    store.set(key, value);
  },
}));

describe('web-sql-router', () => {
  beforeEach(() => {
    store.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('warns and returns empty results for unmatched SQL', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { routeGetAllSync, routeGetFirstSync, routeRunSync } = await import('./web-sql-router');

    expect(routeGetAllSync('SELECT * FROM unknown_table')).toEqual([]);
    expect(routeGetFirstSync('SELECT * FROM unknown_table')).toBeNull();
    expect(routeRunSync('DROP TABLE unknown_table')).toBeUndefined();

    expect(warn).toHaveBeenCalledWith('[WebDb] unmatched SQL', 'SELECT * FROM unknown_table');
    expect(warn).toHaveBeenCalledWith('[WebDb] unmatched SQL', 'DROP TABLE unknown_table');
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it('deletes a single alias feedback row by id via getDb', async () => {
    const { getDb } = await import('./init');
    const db = getDb();

    db.runSync(
      `INSERT INTO alias_feedback
        (id, term, suggested_allergen_id, context, profile_id, scan_input, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['alias-keep', 'a', null, null, null, null, 'pending', '2026-08-14T08:00:00.000Z'],
    );
    db.runSync(
      `INSERT INTO alias_feedback
        (id, term, suggested_allergen_id, context, profile_id, scan_input, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['alias-drop', 'b', null, null, null, null, 'pending', '2026-08-14T08:01:00.000Z'],
    );

    db.runSync('DELETE FROM alias_feedback WHERE id = ?', ['alias-drop']);

    const pending = db.getAllSync<{ id: string }>(
      `SELECT id FROM alias_feedback WHERE status = 'pending' ORDER BY created_at DESC`,
    );
    expect(pending.map((row) => row.id)).toEqual(['alias-keep']);
  });
});
