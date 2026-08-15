import type { ScannerMode } from '@allerguide/core';

export const SCANNER_MODES: ScannerMode[] = ['product', 'menu', 'medicine', 'cosmetics'];

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

export function shouldClearScannerResultOnModeChange(
  current: ScannerMode,
  next: ScannerMode,
): boolean {
  return current !== next;
}
