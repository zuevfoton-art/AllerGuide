import { getDb } from '@/src/db/init';
import { normalizeBarcode, type BarcodeProduct } from '@allerguide/core';

export type BarcodeCacheEntry = BarcodeProduct & {
  originSource: string;
  cachedAt: string;
  updatedAt: string;
};

type BarcodeCacheRow = {
  barcode: string;
  name: string;
  ingredients: string;
  brand: string | null;
  origin_source: string;
  cached_at: string;
  updated_at: string;
};

function rowToEntry(row: BarcodeCacheRow): BarcodeCacheEntry {
  return {
    barcode: row.barcode,
    name: row.name,
    ingredients: row.ingredients,
    brand: row.brand ?? undefined,
    originSource: row.origin_source,
    cachedAt: row.cached_at,
    updatedAt: row.updated_at,
  };
}

export function lookupBarcodeCache(barcode: string): BarcodeCacheEntry | null {
  const normalized = normalizeBarcode(barcode);
  if (!normalized) return null;

  const row = getDb().getFirstSync<BarcodeCacheRow>(
    `SELECT barcode, name, ingredients, brand, origin_source, cached_at, updated_at
     FROM barcode_cache
     WHERE barcode = ?
     LIMIT 1`,
    [normalized],
  );

  return row ? rowToEntry(row) : null;
}

export function saveBarcodeCache(product: {
  barcode: string;
  name: string;
  ingredients: string;
  brand?: string;
  originSource: string;
}): void {
  const normalized = normalizeBarcode(product.barcode);
  if (!normalized) return;

  const now = new Date().toISOString();
  const existing = lookupBarcodeCache(normalized);

  getDb().runSync(
    `INSERT OR REPLACE INTO barcode_cache
      (barcode, name, ingredients, brand, origin_source, cached_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      normalized,
      product.name,
      product.ingredients,
      product.brand ?? null,
      product.originSource,
      existing?.cachedAt ?? now,
      now,
    ],
  );
}

export function getBarcodeCacheSize(): number {
  const row = getDb().getFirstSync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM barcode_cache',
  );
  return row?.count ?? 0;
}
