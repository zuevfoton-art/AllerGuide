import { lookupBarcodeInCatalog, type BarcodeProduct } from '@allerguide/core';
import { fetchProductByBarcode, type OpenFoodFactsProduct } from '@/src/services/open-food-facts-service';
import {
  initBarcodeSqliteCatalog,
  lookupBarcodeInSqlite,
} from '@/src/services/barcode-sqlite-service';

export type BarcodeLookupSource = 'barcodes_db' | 'openfoodfacts';

export type ResolvedBarcodeProduct = OpenFoodFactsProduct & {
  source: BarcodeLookupSource;
  brand?: string;
  category?: string;
};

export async function resolveProductByBarcode(
  barcode: string,
): Promise<ResolvedBarcodeProduct | null> {
  await initBarcodeSqliteCatalog();

  const local =
    lookupBarcodeInSqlite(barcode) ?? lookupBarcodeInCatalog(barcode);
  if (local) {
    return toResolvedProduct(local, 'barcodes_db');
  }

  const remote = await fetchProductByBarcode(barcode);
  if (!remote) return null;

  return { ...remote, source: 'openfoodfacts' };
}

function toResolvedProduct(
  product: BarcodeProduct,
  source: BarcodeLookupSource,
): ResolvedBarcodeProduct {
  return {
    barcode: product.barcode,
    name: product.name,
    ingredients: product.ingredients,
    brand: product.brand,
    category: product.category,
    source,
  };
}
