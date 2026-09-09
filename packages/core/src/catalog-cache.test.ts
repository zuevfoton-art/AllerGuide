import { describe, expect, it } from 'vitest';
import { buildCachedAllergensPayload, isCatalogCacheFresh, mergeAllergenCatalogWithStatic } from './catalog-cache';
import { getAllAllergens } from './allergen-database';

describe('catalog cache helpers', () => {
  it('detects fresh cache entries', () => {
    expect(isCatalogCacheFresh(new Date().toISOString())).toBe(true);
    expect(isCatalogCacheFresh('2020-01-01T00:00:00.000Z')).toBe(false);
  });

  it('builds allergen cache payload', () => {
    const payload = buildCachedAllergensPayload(getAllAllergens().slice(0, 3), 'static');
    expect(payload.allergens).toHaveLength(3);
    expect(payload.source).toBe('static');
    expect(payload.fetchedAt).toBeTruthy();
  });

  it('unions static catalog rows missing from a stale cache', () => {
    const staticCatalog = getAllAllergens();
    const cached = staticCatalog.filter((item) => item.id !== 'oak-pollen');
    const merged = mergeAllergenCatalogWithStatic(cached, staticCatalog);
    expect(merged.some((item) => item.id === 'oak-pollen')).toBe(true);
    expect(merged.length).toBe(staticCatalog.length);
  });
});
