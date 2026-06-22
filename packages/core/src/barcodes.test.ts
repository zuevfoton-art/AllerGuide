import { describe, expect, it } from 'vitest';
import { normalizeBarcode, isValidBarcode } from './barcodes';
import { lookupBarcodeInCatalog, getBarcodeCatalogSize } from './barcodes-catalog';

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

describe('barcodes-catalog', () => {
  it('looks up product by barcode', () => {
    const product = lookupBarcodeInCatalog('4607025392138');
    expect(product?.name).toContain('Аленка');
    expect(product?.ingredients).toContain('молоко');
  });

  it('returns null for unknown barcode', () => {
    expect(lookupBarcodeInCatalog('0000000000000')).toBeNull();
  });

  it('has seeded catalog entries', () => {
    expect(getBarcodeCatalogSize()).toBeGreaterThan(0);
  });
});
