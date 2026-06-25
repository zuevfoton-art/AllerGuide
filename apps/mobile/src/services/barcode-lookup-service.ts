import { expandAllergenTagsForScan } from '@allerguide/core';
import { PRODUCT_DB_ENABLED } from '@/src/constants/features';
import { fetchProductFromCatalog } from '@/src/services/catalog-api';
import { fetchProductByBarcode } from '@/src/services/open-food-facts-service';
import {
  lookupBarcodeCache,
  saveBarcodeCache,
  type BarcodeCacheEntry,
} from '@/src/services/barcode-cache-service';

export type BarcodeLookupSource = 'barcodes_db' | 'catalog_api' | 'openfoodfacts';

export type ResolvedBarcodeProduct = {
  barcode: string;
  name: string;
  ingredients: string;
  brand?: string;
  source: BarcodeLookupSource;
  declaredAllergenIds: string[];
  traceAllergenIds: string[];
};

const OFF_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function isStaleOffCache(entry: BarcodeCacheEntry): boolean {
  if (entry.originSource !== 'openfoodfacts') return false;
  const updated = Date.parse(entry.updatedAt);
  if (Number.isNaN(updated)) return false;
  return Date.now() - updated > OFF_CACHE_MAX_AGE_MS;
}

function buildIngredientsText(
  base: string,
  declaredTags: string[],
  traceTags: string[],
): string {
  const declaredExpanded = expandAllergenTagsForScan(declaredTags);
  const traceExpanded = expandAllergenTagsForScan(traceTags);
  const tracePhrase =
    traceExpanded.length > 0 ? `может содержать ${traceExpanded.join(', ')}` : '';

  return [base, ...declaredExpanded, tracePhrase].filter(Boolean).join(', ');
}

export async function resolveProductByBarcode(
  barcode: string,
): Promise<ResolvedBarcodeProduct | null> {
  // D.2: catalog has priority over local OFF cache.
  if (PRODUCT_DB_ENABLED) {
    const catalogProduct = await fetchProductFromCatalog(barcode);
    if (catalogProduct) {
      const declared = catalogProduct.allergenTags ?? [];
      const traces = catalogProduct.traceTags ?? [];
      const ingredients = buildIngredientsText(catalogProduct.ingredients, declared, traces);

      saveBarcodeCache({
        barcode: catalogProduct.barcode,
        name: catalogProduct.name,
        ingredients,
        originSource: 'catalog_api',
        declaredAllergenIds: declared,
        traceAllergenIds: traces,
      });

      return {
        barcode: catalogProduct.barcode,
        name: catalogProduct.name,
        ingredients,
        source: 'catalog_api',
        declaredAllergenIds: declared,
        traceAllergenIds: traces,
      };
    }
  }

  const cached = lookupBarcodeCache(barcode);
  if (cached && !(PRODUCT_DB_ENABLED && isStaleOffCache(cached))) {
    return toResolvedProduct(cached, 'barcodes_db');
  }

  const remote = await fetchProductByBarcode(barcode);
  if (!remote) return null;

  const ingredients = buildIngredientsText(
    remote.ingredients,
    remote.allergenTags,
    remote.traceTags,
  );

  saveBarcodeCache({
    barcode: remote.barcode,
    name: remote.name,
    ingredients,
    originSource: 'openfoodfacts',
    declaredAllergenIds: remote.allergenTags,
    traceAllergenIds: remote.traceTags,
  });

  return {
    barcode: remote.barcode,
    name: remote.name,
    ingredients,
    source: 'openfoodfacts',
    declaredAllergenIds: remote.allergenTags,
    traceAllergenIds: remote.traceTags,
  };
}

function toResolvedProduct(
  product: BarcodeCacheEntry,
  source: BarcodeLookupSource,
): ResolvedBarcodeProduct {
  return {
    barcode: product.barcode,
    name: product.name,
    ingredients: product.ingredients,
    brand: product.brand,
    source,
    declaredAllergenIds: product.declaredAllergenIds ?? [],
    traceAllergenIds: product.traceAllergenIds ?? [],
  };
}
