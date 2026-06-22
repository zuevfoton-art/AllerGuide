import { fetchProductByBarcode } from '@/src/services/open-food-facts-service';
import {
  lookupBarcodeCache,
  saveBarcodeCache,
  type BarcodeCacheEntry,
} from '@/src/services/barcode-cache-service';

export type BarcodeLookupSource = 'barcodes_db' | 'openfoodfacts';

export type ResolvedBarcodeProduct = {
  barcode: string;
  name: string;
  ingredients: string;
  brand?: string;
  source: BarcodeLookupSource;
};

export async function resolveProductByBarcode(
  barcode: string,
): Promise<ResolvedBarcodeProduct | null> {
  const cached = lookupBarcodeCache(barcode);
  if (cached) {
    return toResolvedProduct(cached, 'barcodes_db');
  }

  const remote = await fetchProductByBarcode(barcode);
  if (!remote) return null;

  saveBarcodeCache({
    barcode: remote.barcode,
    name: remote.name,
    ingredients: remote.ingredients,
    originSource: 'openfoodfacts',
  });

  return {
    barcode: remote.barcode,
    name: remote.name,
    ingredients: remote.ingredients,
    source: 'openfoodfacts',
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
  };
}
