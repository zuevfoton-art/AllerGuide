import {
  buildComponentsFromProduct,
  enrichLocalComponentsWithProduct,
  findDishRecipe,
  isUsefulCatalogMatch,
  normalizeSearchText,
  resolveDishComponents,
  scoreCatalogProductHit,
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
  /** Packaged-product ingredients when resolved via catalog/OFF. */
  ingredients?: string;
  allergenTags?: string[];
  traceTags?: string[];
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

function scoreProduct(query: string, product: SearchHit): number {
  return scoreCatalogProductHit(query, product);
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
  const key = normalizeSearchText(query);
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
  const usefulOff = best && isUsefulCatalogMatch(bestScore) ? best : null;

  if (!localComponents.length && !usefulOff) return null;

  if (localComponents.length && !usefulOff) {
    return {
      components: localComponents,
      dishId: recipe!.id,
      dishName: recipe!.names[0],
      source: 'local',
      ingredients: localComponents.map((item) => item.nameRu).join(', '),
      allergenTags: localComponents
        .map((item) => item.allergenId)
        .filter((id): id is string => Boolean(id)),
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
      ingredients: usefulOff.ingredients || usefulOff.name,
      allergenTags: usefulOff.allergenTags ?? [],
      traceTags: usefulOff.traceTags ?? [],
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
    ingredients: usefulOff!.ingredients || components.map((item) => item.nameRu).join(', '),
    allergenTags: usefulOff!.allergenTags ?? [],
    traceTags: usefulOff!.traceTags ?? [],
  };
}
