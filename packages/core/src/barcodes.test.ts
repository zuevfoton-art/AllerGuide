import { describe, expect, it } from 'vitest';
import { normalizeBarcode, isValidBarcode } from './barcodes';

describe('barcodes', () => {
  it('normalizes barcode digits', () => {
    expect(normalizeBarcode('4607025392138')).toBe('4607025392138');
    expect(normalizeBarcode('4607 0253 92138')).toBe('4607025392138');
    expect(normalizeBarcode('123')).toBe('');
  });

  it('validates barcode length', () => {
    expect(isValidBarcode('4607025392138')).toBe(true);
    expect(isValidBarcode('123')).toBe(false);
  });
});
