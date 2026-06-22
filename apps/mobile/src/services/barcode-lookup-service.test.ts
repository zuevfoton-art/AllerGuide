import { describe, expect, it, vi } from 'vitest';
import { resolveProductByBarcode } from './barcode-lookup-service';

vi.mock('@/src/services/barcode-sqlite-service', () => ({
  initBarcodeSqliteCatalog: vi.fn(async () => false),
  lookupBarcodeInSqlite: vi.fn(() => null),
}));

vi.mock('@/src/services/open-food-facts-service', () => ({
  fetchProductByBarcode: vi.fn(async (barcode: string) => {
    if (barcode === '9999999999999') {
      return {
        barcode: '9999999999999',
        name: 'Remote Product',
        ingredients: 'water, sugar',
      };
    }
    return null;
  }),
}));

describe('barcode-lookup-service', () => {
  it('prefers local catalog over Open Food Facts', async () => {
    const product = await resolveProductByBarcode('4607025392138');
    expect(product?.source).toBe('barcodes_db');
    expect(product?.name).toContain('Аленка');
  });

  it('falls back to Open Food Facts when local miss', async () => {
    const product = await resolveProductByBarcode('9999999999999');
    expect(product?.source).toBe('openfoodfacts');
    expect(product?.name).toBe('Remote Product');
  });

  it('returns null when not found anywhere', async () => {
    const product = await resolveProductByBarcode('0000000000000');
    expect(product).toBeNull();
  });
});
