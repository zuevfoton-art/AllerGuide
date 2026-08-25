import {
  rankLocalDishSuggestions,
  type DishSuggestion,
} from '@allerguide/core';
import { PRODUCT_DB_ENABLED } from '@/src/constants/features';
import { searchProductsFromCatalog } from '@/src/services/catalog-api';
import { searchProductsByName } from '@/src/services/open-food-facts-service';
import { logCaughtError } from '@/src/services/error-reporting';
import { getApiBaseUrl } from '@/src/services/api-client';

const SEARCH_LIMIT = 8;

const DISH_SEARCH_TIMEOUT_MS = 2500;

async function searchDishesFromApi(query: string): Promise<DishSuggestion[]> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DISH_SEARCH_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${baseUrl}/api/dishes/search?q=${encodeURIComponent(query)}`,
      { signal: controller.signal },
    );
    if (!response.ok) return [];
    const data = (await response.json()) as { ok?: boolean; dishes?: DishSuggestion[] };
    if (!data.ok || !Array.isArray(data.dishes)) return [];
    return data.dishes;
  } catch (error) {
    if (!(error instanceof Error && error.name === 'AbortError')) {
      logCaughtError('searchDishesFromApi', error, { extra: { query } });
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function mergeSuggestions(groups: DishSuggestion[][]): DishSuggestion[] {
  const seen = new Set<string>();
  const out: DishSuggestion[] = [];
  for (const group of groups) {
    for (const item of group) {
      const key = `${item.source}:${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
      if (out.length >= SEARCH_LIMIT) return out;
    }
  }
  return out;
}

export async function searchDishSuggestions(query: string): Promise<DishSuggestion[]> {
  const local = rankLocalDishSuggestions(query, SEARCH_LIMIT);
  // Catalog already answered — skip Open Food Facts so typeahead cannot hang.
  const [apiDishes, catalogProducts, offProducts] = await Promise.all([
    searchDishesFromApi(query),
    PRODUCT_DB_ENABLED
      ? searchProductsFromCatalog(query).catch(() => [])
      : Promise.resolve([]),
    local.length > 0 ? Promise.resolve([]) : searchProductsByName(query, 6).catch(() => []),
  ]);

  const fromCatalog: DishSuggestion[] = catalogProducts.map((product) => ({
    id: `catalog:${product.barcode}`,
    name: product.name,
    source: 'catalog',
    score: 60,
    ingredientsPreview: product.ingredients,
    barcode: product.barcode,
  }));
  const fromOff: DishSuggestion[] = offProducts.map((product) => ({
    id: `off:${product.barcode}`,
    name: product.name,
    source: 'openfoodfacts',
    score: 55,
    ingredientsPreview: product.ingredients,
    barcode: product.barcode,
  }));

  return mergeSuggestions([local, apiDishes, fromCatalog, fromOff]);
}
