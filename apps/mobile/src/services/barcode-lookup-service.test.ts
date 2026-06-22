import { describe, expect, it, vi, beforeEach } from 'vitest';
import { resolveProductByBarcode } from './barcode-lookup-service';

const cache = new Map<string, { barcode: string; name: string; ingredients: string }>();

vi.mock('@/src/services/barcode-cache-service', () => ({
  lookupBarcodeCache: vi.fn((barcode: string) => cache.get(barcode) ?? null),
  saveBarcodeCache: vi.fn((product: { barcode: string; name: string; ingredients: string }) => {
    cache.set(product.barcode, product);
  }),
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
  beforeEach(() => {
    cache.clear();
  });

  it('returns cached product without calling remote', async () => {
    cache.set('4607025392138', {
      barcode: '4607025392138',
      name: 'Cached Product',
      ingredients: 'milk, sugar',
    });

    const product = await resolveProductByBarcode('4607025392138');
    expect(product?.source).toBe('barcodes_db');
    expect(product?.name).toBe('Cached Product');
  });

  it('fetches online and saves to cache on first scan', async () => {
    const product = await resolveProductByBarcode('9999999999999');
    expect(product?.source).toBe('openfoodfacts');
    expect(product?.name).toBe('Remote Product');
    expect(cache.has('9999999999999')).toBe(true);
  });

  it('uses cache on second scan of the same barcode', async () => {
    await resolveProductByBarcode('9999999999999');
    const product = await resolveProductByBarcode('9999999999999');
    expect(product?.source).toBe('barcodes_db');
  });

  it('returns null when not found anywhere', async () => {
    const product = await resolveProductByBarcode('0000000000000');
    expect(product).toBeNull();
  });
});
