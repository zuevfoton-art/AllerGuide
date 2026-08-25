import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enrichDishFromOpenFoods } from '@/src/services/dish-off-enrichment-service';
import { searchProductsByName } from '@/src/services/open-food-facts-service';

vi.mock('@/src/services/open-food-facts-service', () => ({
  searchProductsByName: vi.fn(async () => {
    throw new Error('OFF should not be called for a known catalog dish');
  }),
}));

vi.mock('@/src/services/catalog-api', () => ({
  searchProductsFromCatalog: vi.fn(async () => []),
}));

vi.mock('@/src/services/error-reporting', () => ({
  logCaughtError: vi.fn(),
}));

vi.mock('@/src/constants/features', () => ({
  PRODUCT_DB_ENABLED: false,
}));

describe('enrichDishFromOpenFoods', () => {
  beforeEach(() => {
    vi.mocked(searchProductsByName).mockClear();
  });

  it('returns a known dish from the local catalog without waiting on Open Food Facts', async () => {
    const result = await enrichDishFromOpenFoods('карбонара');
    expect(result?.source).toBe('local');
    expect(result?.dishId).toBe('carbonara');
    expect(result?.components.length).toBeGreaterThan(0);
    expect(searchProductsByName).not.toHaveBeenCalled();
  });
});
