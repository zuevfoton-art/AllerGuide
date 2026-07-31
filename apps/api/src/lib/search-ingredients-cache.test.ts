import { afterEach, describe, expect, it } from 'vitest';
import {
  getCachedIngredients,
  resetSearchIngredientsState,
  searchIngredientsCacheKey,
  setCachedIngredients,
  consumeSearchBudget,
  recordSearchCacheHit,
  getSearchIngredientsMetrics,
} from './search-ingredients-cache';

describe('search-ingredients-cache', () => {
  afterEach(() => {
    resetSearchIngredientsState();
    delete process.env.SEARCH_DAILY_BUDGET;
    delete process.env.SCAN_DAILY_BUDGET;
  });

  it('caches ingredients by normalized query', async () => {
    const key = searchIngredientsCacheKey('  Оливье  ');
    expect(key).toBe(searchIngredientsCacheKey('оливье'));

    await setCachedIngredients(key, {
      query: 'оливье',
      productName: 'оливье',
      ingredients: 'картофель, майонез',
      source: 'yandex_gen',
    });

    const hit = await getCachedIngredients(key);
    expect(hit?.ingredients).toContain('картофель');
  });

  it('enforces daily search budget', () => {
    process.env.SEARCH_DAILY_BUDGET = '2';
    expect(consumeSearchBudget('user:a')).toBe(true);
    expect(consumeSearchBudget('user:a')).toBe(true);
    expect(consumeSearchBudget('user:a')).toBe(false);
  });

  it('tracks cache hit metrics', () => {
    recordSearchCacheHit();
    expect(getSearchIngredientsMetrics().cacheHits).toBe(1);
  });
});
