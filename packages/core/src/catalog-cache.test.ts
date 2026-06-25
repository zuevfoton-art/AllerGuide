import { describe, expect, it } from 'vitest';
import { buildCachedAllergensPayload, isCatalogCacheFresh } from './catalog-cache';
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
});
