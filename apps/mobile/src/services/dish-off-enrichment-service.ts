import {
  buildComponentsFromProduct,
  enrichLocalComponentsWithProduct,
  findDishRecipe,
  resolveDishComponents,
  type DishComponentDef,
  type ProductDishInput,
} from '@allerguide/core';
import { PRODUCT_DB_ENABLED } from '@/src/constants/features';
import { searchProductsFromCatalog, type CatalogProduct } from '@/src/services/catalog-api';
import {
  searchProductsByName,
  type OpenFoodFactsProduct,
} from '@/src/services/open-food-facts-service';
import { logCaughtError } from '@/src/services/error-reporting';

export type DishEnrichmentSource = 'local' | 'catalog' | 'openfoodfacts' | 'mixed';

export type DishEnrichmentResult = {
  components: DishComponentDef[];
  dishId: string;
  dishName: string;
  source: DishEnrichmentSource;
  productBarcode?: string;
  productName?: string;
  /** Component ids from the local catalog before OFF merge (for selection preserve). */
  previousAvailableIds?: string[];
};

type SearchHit = ProductDishInput & {
  barcode: string;
  name: string;
  source: 'catalog' | 'openfoodfacts';
};

const searchCache = new Map<string, { at: number; hits: SearchHit[] }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');
}

function scoreProduct(query: string, product: SearchHit): number {
  const q = normalizeQuery(query);
  const name = normalizeQuery(product.name);
  let score = 0;
  if (name === q) score += 100;
  else if (name.includes(q) || q.includes(name)) score += 60;
  else {
    const tokens = q.split(' ').filter((t) => t.length > 2);
    score += tokens.filter((t) => name.includes(t)).length * 15;
  }
  if (product.allergenTags?.length) score += 10;
  if (product.ingredients && product.ingredients.length > 20) score += 8;
  if (product.traceTags?.length) score += 3;
  return score;
}

function toSearchHit(
  product: CatalogProduct | OpenFoodFactsProduct,
  source: 'catalog' | 'openfoodfacts',
): SearchHit {
  return {
    barcode: product.barcode,
    name: product.name,
    ingredients: product.ingredients,
    allergenTags: product.allergenTags,
    traceTags: product.traceTags,
    source,
  };
}

async function searchProducts(query: string): Promise<SearchHit[]> {
  const key = normalizeQuery(query);
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.hits;

  const hits: SearchHit[] = [];
  const seen = new Set<string>();

  const pushAll = (
    products: Array<CatalogProduct | OpenFoodFactsProduct>,
    source: 'catalog' | 'openfoodfacts',
  ) => {
    for (const product of products) {
      if (seen.has(product.barcode)) continue;
      seen.add(product.barcode);
      hits.push(toSearchHit(product, source));
    }
  };

  try {
    if (PRODUCT_DB_ENABLED) {
      pushAll(await searchProductsFromCatalog(query), 'catalog');
    }
    const bestCatalog = hits.reduce((max, hit) => Math.max(max, scoreProduct(query, hit)), 0);
    // Always query OFF when catalog is empty or only weak matches — dish enrichment
    // needs packaged product data even if the local product DB has unrelated hits.
    if (hits.length === 0 || bestCatalog < 50) {
      pushAll(await searchProductsByName(query), 'openfoodfacts');
    }
  } catch (error) {
    logCaughtError('searchProductsForDish', error, { level: 'warn', extra: { query } });
  }

  hits.sort((a, b) => scoreProduct(query, b) - scoreProduct(query, a));
  searchCache.set(key, { at: Date.now(), hits });
  return hits;
}

/**
 * Resolve dish ingredients: local catalog first, then enrich / fill from
 * Open Food Facts (via catalog API when enabled, else direct OFF search).
 */
export async function enrichDishFromOpenFoods(
  foodText: string,
): Promise<DishEnrichmentResult | null> {
  const food = foodText.trim();
  if (food.length < 2) return null;

  const recipe = findDishRecipe(food);
  const localComponents = resolveDishComponents(food);
  const hits = await searchProducts(food);
  const best = hits[0];
  const bestScore = best ? scoreProduct(food, best) : 0;

  // Weak name match — ignore OFF noise for known local dishes.
  const usefulOff = best && bestScore >= 40 ? best : null;

  if (!localComponents.length && !usefulOff) return null;

  if (localComponents.length && !usefulOff) {
    return {
      components: localComponents,
      dishId: recipe!.id,
      dishName: recipe!.names[0],
      source: 'local',
    };
  }

  if (!localComponents.length && usefulOff) {
    const components = buildComponentsFromProduct(usefulOff);
    if (!components.length) return null;
    return {
      components,
      dishId: `off:${usefulOff.barcode}`,
      dishName: usefulOff.name,
      source: usefulOff.source,
      productBarcode: usefulOff.barcode,
      productName: usefulOff.name,
    };
  }

  const previousAvailableIds = localComponents.map((item) => item.id);
  const components = enrichLocalComponentsWithProduct(localComponents, usefulOff!);
  return {
    components,
    dishId: recipe?.id ?? `off:${usefulOff!.barcode}`,
    dishName: recipe?.names[0] ?? usefulOff!.name,
    source: 'mixed',
    productBarcode: usefulOff!.barcode,
    productName: usefulOff!.name,
    previousAvailableIds,
  };
}
