import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SafeProduct, ScanHistoryEntry } from '@allerguide/core';

const store = new Map<string, unknown>();

vi.mock('@/src/db/web-store', () => ({
  flushWebStore: vi.fn(async () => undefined),
  hydrateWebStore: vi.fn(async () => undefined),
  loadJson: <T>(key: string, fallback: T): T => (store.get(key) as T | undefined) ?? fallback,
  saveJson: (key: string, value: unknown) => {
    store.set(key, value);
  },
}));

describe('WebDb scanner persistence', () => {
  beforeEach(() => {
    store.clear();
  });

  it('deletes a safe product only when id and profile match', async () => {
    const { getDb } = await import('./init');
    const db = getDb();

    db.runSync(
      'INSERT INTO safe_products (profileId, name, mode, input, savedAt) VALUES (?, ?, ?, ?, ?)',
      [8, 'Йогурт', 'product', 'молоко', '2026-08-14T08:00:00.000Z'],
    );

    db.runSync('DELETE FROM safe_products WHERE id = ? AND profileId = ?', [1, 7]);
    expect(db.getAllSync<SafeProduct>('SELECT * FROM safe_products WHERE profileId = ?', [8])).toHaveLength(1);

    db.runSync('DELETE FROM safe_products WHERE id = ? AND profileId = ?', [1, 8]);
    expect(db.getAllSync<SafeProduct>('SELECT * FROM safe_products WHERE profileId = ?', [8])).toEqual([]);
  });

  it('persists alias feedback that the web store previously dropped', async () => {
    const { getDb } = await import('./init');
    const db = getDb();

    db.runSync(
      `INSERT INTO alias_feedback
        (id, term, suggested_allergen_id, context, profile_id, scan_input, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['alias-1', 'молочко', null, 'product', 7, 'молоко', 'pending', '2026-08-14T08:00:00.000Z'],
    );

    const pending = db.getAllSync<{ id: string; term: string }>(
      `SELECT id, term FROM alias_feedback WHERE status = 'pending' ORDER BY created_at DESC`,
    );
    expect(pending).toEqual([{ id: 'alias-1', term: 'молочко' }]);
  });

  it('stores scan history rows for later structured restore', async () => {
    const { getDb } = await import('./init');
    const db = getDb();

    db.runSync(
      'INSERT INTO scan_history (profileId, mode, input, verdict, matches, level, productName, source, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        7,
        'product',
        '4601234567890',
        'осторожно',
        JSON.stringify({ direct: ['Молоко'], cross: ['Яблоко'], trace: [], composition: 'молоко' }),
        'high',
        'Йогурт',
        'barcode',
        '2026-08-14T08:00:00.000Z',
      ],
    );

    const [entry] = db.getAllSync<ScanHistoryEntry>(
      'SELECT * FROM scan_history WHERE profileId = ? ORDER BY id DESC',
      [7],
    );
    expect(entry.input).toBe('4601234567890');
    expect(JSON.parse(entry.matches)).toMatchObject({
      direct: ['Молоко'],
      composition: 'молоко',
    });
  });
});
