import { describe, expect, it } from 'vitest';
import {
  isManualBarcodeInput,
  SCANNER_MODE_LABEL_KEYS,
  SMART_SCAN_MODE,
  shouldShowScannerPageTrustLine,
} from './scanner-mode';

describe('scanner mode helpers', () => {
  it('keeps label keys for saved-history rows', () => {
    expect(SCANNER_MODE_LABEL_KEYS).toEqual({
      product: 'scanner.product',
      menu: 'scanner.menu',
      medicine: 'scanner.medicine',
      cosmetics: 'scanner.cosmetics',
    });
  });

  it('uses product as the domain mode for the smart scanner', () => {
    expect(SMART_SCAN_MODE).toBe('product');
  });

  it('hides the page trust line when a result is on screen', () => {
    expect(shouldShowScannerPageTrustLine(false)).toBe(true);
    expect(shouldShowScannerPageTrustLine(true)).toBe(false);
  });

  it('treats 8–14 digits as a barcode and everything else as composition', () => {
    expect(isManualBarcodeInput('4601234567890')).toBe(true);
    expect(isManualBarcodeInput(' 12345678 ')).toBe(true);
    expect(isManualBarcodeInput('1234567')).toBe(false);
    expect(isManualBarcodeInput('123456789012345')).toBe(false);
    expect(isManualBarcodeInput('Состав: молоко, пшеничная мука')).toBe(false);
  });
});
