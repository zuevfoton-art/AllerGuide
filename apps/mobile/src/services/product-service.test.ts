import { describe, expect, it } from 'vitest';
import {
  getBundledMarketplaceProducts,
  getRecommendedMarketplaceProducts,
  loadMarketplaceCatalog,
  searchRecommendedMarketplaceProducts,
} from './product-service';

describe('product-service marketplace catalog', () => {
  it('returns bundled products with photos', () => {
    const products = getBundledMarketplaceProducts();
    expect(products.length).toBeGreaterThanOrEqual(10);
    expect(products.every((product) => product.imageUrl.startsWith('https://'))).toBe(true);
  });

  it('hides conflicting food items for a milk profile', () => {
    const products = getRecommendedMarketplaceProducts(getBundledMarketplaceProducts(), {
      id: 1,
      userId: 1,
      name: 'Test',
      allergies: JSON.stringify(['milk']),
    } as never);
    expect(products.some((product) => product.containsAllergenIds.includes('milk'))).toBe(false);
  });

  it('filters pharmacy category and search', () => {
    const hits = searchRecommendedMarketplaceProducts(
      getBundledMarketplaceProducts(),
      null,
      'цетиризин',
      'pharmacy',
    );
    expect(hits.map((product) => product.id)).toContain('cetirizine-otc');
    expect(hits.every((product) => product.category === 'pharmacy')).toBe(true);
  });

  it('loads the bundled seed when the API is not configured', async () => {
    const result = await loadMarketplaceCatalog();
    expect(result.source).toBe('seed');
    expect(result.stale).toBe(false);
    expect(result.items.length).toBeGreaterThanOrEqual(10);
    expect(result.items.some((product) => product.kind === 'medicine')).toBe(true);
  });
});
