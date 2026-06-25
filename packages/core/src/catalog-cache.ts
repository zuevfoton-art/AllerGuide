import type { AllergenRecord } from './allergen-database';

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
}

export function isCatalogCacheFresh(fetchedAt: string, ttlMs = CATALOG_CACHE_TTL_MS): boolean {
  const ts = Date.parse(fetchedAt);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < ttlMs;
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
