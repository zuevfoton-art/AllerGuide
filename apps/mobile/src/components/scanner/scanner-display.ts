import type { ScanResultExtended } from '@/src/services/scanner-service';

export type CameraEntryMode = 'barcode' | 'scanner';
export type ScannerListTab = 'recent' | 'saved';

/** i18n key for a scan result source chip — keeps source mapping out of JSX. */
export function scanSourceLabelKey(source?: ScanResultExtended['source']): string {
  if (source === 'openfoodfacts') return 'scanner.sourceOpenFoodFacts';
  if (source === 'openbeautyfacts') return 'scanner.sourceOpenBeautyFacts';
  if (source === 'openproductsfacts') return 'scanner.sourceOpenProductsFacts';
  if (source === 'barcodes_db') return 'scanner.sourceBarcodesDb';
  if (source === 'barcode') return 'scanner.sourceBarcode';
  if (source === 'ocr') return 'scanner.sourceOcr';
  if (source === 'llm') return 'scanner.sourceLlm';
  if (source === 'dish_vision') return 'scanner.sourceDishVision';
  if (source === 'catalog_api') return 'scanner.sourceCatalogApi';
  return 'scanner.sourceManual';
}
