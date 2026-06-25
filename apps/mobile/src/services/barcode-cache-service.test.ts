import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  getBarcodeCacheSize,
  lookupBarcodeCache,
  saveBarcodeCache,
} from './barcode-cache-service';

const store = new Map<string, unknown>();

vi.mock('@/src/db/init', () => ({
  getDb: () => ({
    getFirstSync: <T>(sql: string, params?: unknown[]): T | null => {
      const query = sql.toLowerCase();
      if (query.includes('from barcode_cache') && query.includes('where barcode =')) {
        return (store.get(String(params?.[0])) as T | undefined) ?? null;
      }
      if (query.includes('count(*)')) {
        return { count: store.size } as T;
      }
      return null;
    },
    runSync: (sql: string, params?: unknown[]) => {
      if (!sql.toLowerCase().includes('barcode_cache')) return;
      store.set(String(params?.[0]), {
        barcode: params?.[0],
        name: params?.[1],
        ingredients: params?.[2],
        brand: params?.[3],
        origin_source: params?.[4],
        cached_at: params?.[5],
        updated_at: params?.[6],
      });
    },
  }),
}));

describe('barcode-cache-service', () => {
  beforeEach(() => {
    store.clear();
  });

  it('saves and reads cached product', () => {
    saveBarcodeCache({
      barcode: '4607025392138',
      name: 'Test Product',
      ingredients: 'milk, sugar',
      originSource: 'openfoodfacts',
    });

    const cached = lookupBarcodeCache('4607025392138');
    expect(cached?.name).toBe('Test Product');
    expect(cached?.originSource).toBe('openfoodfacts');
    expect(getBarcodeCacheSize()).toBe(1);
  });
});
