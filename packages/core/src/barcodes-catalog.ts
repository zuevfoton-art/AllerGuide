import catalog from './data/barcodes-catalog.json';
import { normalizeBarcode, type BarcodeProduct } from './barcodes';

export const BARCODES_CATALOG = catalog as BarcodeProduct[];

const barcodeIndex = new Map<string, BarcodeProduct>(
  BARCODES_CATALOG.map((product) => [product.barcode, product]),
);

export function lookupBarcodeInCatalog(barcode: string): BarcodeProduct | null {
  const normalized = normalizeBarcode(barcode);
  if (!normalized) return null;
  return barcodeIndex.get(normalized) ?? null;
}

export function getBarcodeCatalogSize(): number {
  return barcodeIndex.size;
}
