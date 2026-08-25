import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rankLocalDishSuggestions } from '@allerguide/core';
import { searchDishSuggestions } from '@/src/services/dish-suggest-service';
import { searchProductsByName } from '@/src/services/open-food-facts-service';

vi.mock('@/src/services/open-food-facts-service', () => ({
  searchProductsByName: vi.fn(async () => {
    throw new Error('OFF should not run when local catalog already matched');
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

vi.mock('@/src/services/api-client', () => ({
  getApiBaseUrl: () => '',
}));

describe('local dish suggestions', () => {
  beforeEach(() => {
    vi.mocked(searchProductsByName).mockClear();
  });

  it('ranks spaghetti bolognese from a typo', () => {
    const hits = rankLocalDishSuggestions('спагетти балоньезе');
    expect(hits[0]?.id).toBe('spaghetti-bolognese');
    expect(hits[0]?.ingredientsPreview).toMatch(/говядина|томат|макарон/i);
  });

  it('does not query Open Food Facts when the local catalog already has hits', async () => {
    const hits = await searchDishSuggestions('карбонара');
    expect(hits.some((item) => item.id === 'carbonara')).toBe(true);
    expect(searchProductsByName).not.toHaveBeenCalled();
  });
});

