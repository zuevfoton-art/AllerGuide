import { Platform } from 'react-native';
import {
  buildCachedAllergensPayload,
  buildCachedProductPayload,
  getAllAllergens,
  isCatalogCacheFresh,
  type AllergenRecord,
  type CachedCatalogAllergens,
  type CachedCatalogProduct,
} from '@allerguide/core';
import { getDb } from '@/src/db/init';
import { loadJson, saveJson } from '@/src/db/web-store';
import type { CatalogProduct } from '@/src/services/catalog-api';

const WEB_ALLERGENS_KEY = 'ag_catalog_allergens';
const WEB_PRODUCTS_KEY = 'ag_catalog_products';

type ProductCacheMap = Record<string, CachedCatalogProduct>;

function useWebStore(): boolean {
  return Platform.OS === 'web';
}

function readWebAllergenSnapshot(): CachedCatalogAllergens | null {
  return loadJson<CachedCatalogAllergens | null>(WEB_ALLERGENS_KEY, null);
}

function writeWebAllergenSnapshot(snapshot: CachedCatalogAllergens) {
  saveJson(WEB_ALLERGENS_KEY, snapshot);
}

function readWebProductMap(): ProductCacheMap {
  return loadJson<ProductCacheMap>(WEB_PRODUCTS_KEY, {});
}

function writeWebProductMap(map: ProductCacheMap) {
  saveJson(WEB_PRODUCTS_KEY, map);
}

export function getCachedAllergenCatalog(): CachedCatalogAllergens | null {
  if (useWebStore()) {
    const snapshot = readWebAllergenSnapshot();
    return snapshot && isCatalogCacheFresh(snapshot.fetchedAt) ? snapshot : null;
  }

  const row = getDb().getFirstSync<{ payload: string; fetched_at: string; source: string }>(
    'SELECT payload, fetched_at, source FROM catalog_allergen_snapshot WHERE id = 1',
  );
  if (!row || !isCatalogCacheFresh(row.fetched_at)) return null;

  try {
    const allergens = JSON.parse(row.payload) as AllergenRecord[];
    return {
      fetchedAt: row.fetched_at,
      source: row.source as CachedCatalogAllergens['source'],
      allergens,
    };
  } catch {
    return null;
  }
}

export function saveCachedAllergenCatalog(
  allergens: AllergenRecord[],
  source: CachedCatalogAllergens['source'],
): CachedCatalogAllergens {
  const snapshot = buildCachedAllergensPayload(allergens, source);

  if (useWebStore()) {
    writeWebAllergenSnapshot(snapshot);
    return snapshot;
  }

  getDb().runSync(
    `INSERT OR REPLACE INTO catalog_allergen_snapshot (id, payload, fetched_at, source)
     VALUES (1, ?, ?, ?)`,
    [JSON.stringify(allergens), snapshot.fetchedAt, source],
  );

  return snapshot;
}

export function getCachedCatalogProduct(barcode: string): CachedCatalogProduct | null {
  const normalized = barcode.replace(/\s+/g, '').trim();
  if (!normalized) return null;

  if (useWebStore()) {
    const product = readWebProductMap()[normalized];
    return product && isCatalogCacheFresh(product.fetchedAt) ? product : null;
  }

  const row = getDb().getFirstSync<{
    barcode: string;
    name: string;
    brand: string;
    image_url: string;
    ingredients: string;
    allergen_tags: string;
    trace_tags: string | null;
    source: string;
    fetched_at: string;
  }>(
    `SELECT barcode, name, brand, image_url, ingredients, allergen_tags, trace_tags, source, fetched_at
     FROM catalog_products WHERE barcode = ?`,
    [normalized],
  );

  if (!row || !isCatalogCacheFresh(row.fetched_at)) return null;

  let allergenTags: string[] = [];
  let traceTags: string[] = [];
  try {
    allergenTags = JSON.parse(row.allergen_tags) as string[];
  } catch {
    allergenTags = [];
  }
  try {
    traceTags = JSON.parse(row.trace_tags ?? '[]') as string[];
  } catch {
    traceTags = [];
  }

  return {
    barcode: row.barcode,
    name: row.name,
    brand: row.brand,
    imageUrl: row.image_url,
    ingredients: row.ingredients,
    allergenTags,
    traceTags,
    source: row.source,
    fetchedAt: row.fetched_at,
  };
}

export function saveCachedCatalogProduct(
  product: CatalogProduct,
  source: string,
): CachedCatalogProduct {
  const cached = buildCachedProductPayload({
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    imageUrl: product.imageUrl,
    ingredients: product.ingredients,
    allergenTags: product.allergenTags,
    traceTags: product.traceTags,
    source,
  });

  if (useWebStore()) {
    const map = readWebProductMap();
    map[cached.barcode] = cached;
    writeWebProductMap(map);
    return cached;
  }

  getDb().runSync(
    `INSERT OR REPLACE INTO catalog_products
      (barcode, name, brand, image_url, ingredients, allergen_tags, trace_tags, source, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cached.barcode,
      cached.name,
      cached.brand,
      cached.imageUrl,
      cached.ingredients,
      JSON.stringify(cached.allergenTags),
      JSON.stringify(cached.traceTags),
      cached.source,
      cached.fetchedAt,
    ],
  );

  return cached;
}

export function getResolvedAllergenCatalog(): AllergenRecord[] {
  return getCachedAllergenCatalog()?.allergens ?? getAllAllergens();
}

export function cachedCatalogProductToDto(product: CachedCatalogProduct): CatalogProduct {
  return {
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    imageUrl: product.imageUrl,
    ingredients: product.ingredients,
    allergenTags: product.allergenTags,
    traceTags: product.traceTags,
  };
}
