import type { ScannerMode } from '@allerguide/core';

/** Domain mode passed to scanFromOcr / safe-product saves after mode chips were removed. */
export const SMART_SCAN_MODE: ScannerMode = 'product';

const MANUAL_BARCODE_PATTERN = /^\d{8,14}$/;

/** Digits-only 8–14: treat manual entry as a barcode (web camera fallback). */
export function isManualBarcodeInput(text: string): boolean {
  return MANUAL_BARCODE_PATTERN.test(text.trim());
}

export const SCANNER_MODE_LABEL_KEYS: Record<
  ScannerMode,
  'scanner.product' | 'scanner.menu' | 'scanner.medicine' | 'scanner.cosmetics'
> = {
  product: 'scanner.product',
  menu: 'scanner.menu',
  medicine: 'scanner.medicine',
  cosmetics: 'scanner.cosmetics',
};

/** Page-level trust copy is hidden once a result (and its own trust strip) is shown. */
export function shouldShowScannerPageTrustLine(hasResult: boolean): boolean {
  return !hasResult;
}
