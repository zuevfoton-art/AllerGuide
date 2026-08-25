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

async function searchDishesFromApi(query: string): Promise<DishSuggestion[]> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/api/dishes/search?q=${encodeURIComponent(query)}`,
    );
    if (!response.ok) return [];
    const data = (await response.json()) as { ok?: boolean; dishes?: DishSuggestion[] };
    if (!data.ok || !Array.isArray(data.dishes)) return [];
    return data.dishes;
  } catch (error) {
    logCaughtError('searchDishesFromApi', error, { extra: { query } });
    return [];
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
  const [apiDishes, catalogProducts, offProducts] = await Promise.all([
    searchDishesFromApi(query),
    PRODUCT_DB_ENABLED
      ? searchProductsFromCatalog(query).catch(() => [])
      : Promise.resolve([]),
    searchProductsByName(query, 6).catch(() => []),
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
