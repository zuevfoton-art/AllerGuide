import { beforeEach, describe, expect, it, vi } from 'vitest';

const rows: {
  id: number;
  profileId: number;
  name: string;
  mode: string;
  input: string;
  savedAt: string;
}[] = [];

let nextId = 1;
const persistDbWrites = vi.fn(async () => undefined);
const ownedProfileIds = [7];

const runSync = vi.fn((sql: string, params: unknown[] = []) => {
  if (sql.startsWith('INSERT INTO safe_products')) {
    const [profileId, name, mode, input, savedAt] = params as [
      number,
      string,
      string,
      string,
      string,
    ];
    rows.push({ id: nextId++, profileId, name, mode, input, savedAt });
    return;
  }
  if (sql.startsWith('DELETE FROM safe_products WHERE id = ? AND profileId = ?')) {
    const [id, profileId] = params as [number, number];
    const index = rows.findIndex((row) => row.id === id && row.profileId === profileId);
    if (index >= 0) rows.splice(index, 1);
  }
});

const getAllSync = vi.fn((sql: string, params: unknown[] = []) => {
  if (sql.includes('FROM profiles WHERE userId')) {
    return ownedProfileIds.map((id) => ({ id }));
  }
  if (sql.includes('FROM safe_products WHERE profileId')) {
    return rows.filter((row) => row.profileId === params[0]).sort((a, b) => b.id - a.id);
  }
  return [];
});

vi.mock('@/src/db/init', () => ({
  getDb: () => ({ runSync, getAllSync, getFirstSync: vi.fn() }),
  persistDbWrites: () => persistDbWrites(),
}));

vi.mock('@/src/services/auth-service', () => ({
  getCurrentUserId: () => 3,
}));

describe('safe-products-service', () => {
  beforeEach(() => {
    rows.length = 0;
    nextId = 1;
    ownedProfileIds.splice(0, ownedProfileIds.length, 7);
    runSync.mockClear();
    persistDbWrites.mockClear();
  });

  it('rejects add/list/remove for a foreign profile', async () => {
    const { addSafeProduct, listSafeProducts, removeSafeProduct } = await import(
      './safe-products-service'
    );

    expect(await addSafeProduct(99, 'Йогурт', 'product', 'молоко')).toEqual({
      ok: false,
      code: 'profile_not_found',
    });
    expect(listSafeProducts(99)).toEqual([]);
    expect(await removeSafeProduct(1, 99)).toEqual({ ok: false, code: 'profile_not_found' });
    expect(runSync).not.toHaveBeenCalled();
  });

  it('deletes only the owned row and flushes persistence', async () => {
    const { addSafeProduct, removeSafeProduct, listSafeProducts, isSafeProductSaved } = await import(
      './safe-products-service'
    );

    expect(await addSafeProduct(7, 'Йогурт', 'product', 'молоко')).toEqual({ ok: true });
    expect(isSafeProductSaved(listSafeProducts(7), 'молоко', 'menu')).toBe(false);
    expect(isSafeProductSaved(listSafeProducts(7), 'молоко', 'product')).toBe(true);

    expect(await removeSafeProduct(1, 7)).toEqual({ ok: true });
    expect(listSafeProducts(7)).toEqual([]);
    expect(persistDbWrites).toHaveBeenCalledTimes(2);
    expect(runSync).toHaveBeenCalledWith(
      'DELETE FROM safe_products WHERE id = ? AND profileId = ?',
      [1, 7],
    );
  });
});
