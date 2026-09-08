import { getAllAllergens, type AllergenRecord } from './allergen-database';

export const CATALOG_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CachedCatalogAllergens {
  fetchedAt: string;
  source: 'db' | 'static';
  allergens: AllergenRecord[];
}

export interface CachedCatalogProduct {
  barcode: string;
  name: string;
  brand: string;
  imageUrl: string;
  ingredients: string;
  allergenTags: string[];
  traceTags: string[];
  source: string;
  fetchedAt: string;
  category?: string;
}

export function isCatalogCacheFresh(fetchedAt: string, ttlMs = CATALOG_CACHE_TTL_MS): boolean {
  const ts = Date.parse(fetchedAt);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < ttlMs;
}

/**
 * Cached / API catalogs can lag a core update by the TTL (7 days).
 * Union in bundled rows so newly shipped allergen ids stay selectable.
 */
export function mergeAllergenCatalogWithStatic(
  cached: AllergenRecord[] | undefined,
  staticCatalog: AllergenRecord[] = getAllAllergens(),
): AllergenRecord[] {
  if (!cached?.length) return staticCatalog;
  const byId = new Map(cached.map((item) => [item.id, item]));
  for (const item of staticCatalog) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  return [...byId.values()];
}

export function buildCachedAllergensPayload(
  allergens: AllergenRecord[],
  source: 'db' | 'static',
): CachedCatalogAllergens {
  return {
    fetchedAt: new Date().toISOString(),
    source,
    allergens,
  };
}

export function buildCachedProductPayload(
  product: Omit<CachedCatalogProduct, 'fetchedAt'>,
): CachedCatalogProduct {
  return {
    ...product,
    fetchedAt: new Date().toISOString(),
  };
}
