import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchProductByBarcode } from './open-food-facts-service';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('fetchProductByBarcode', () => {
  it('still queries Open Beauty Facts when the food dataset fails', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('openfoodfacts.org') && !String(url).includes('openbeauty')) {
        throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
      }
      if (String(url).includes('openbeautyfacts.org')) {
        return new Response(
          JSON.stringify({
            status: 1,
            product: {
              code: '4005808890590',
              product_name: 'Nivea crème',
              ingredients_text: 'Aqua, Glycerin',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ status: 0 }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const product = await fetchProductByBarcode('4005808890590');
    expect(product?.name).toBe('Nivea crème');
    expect(product?.source).toBe('openbeautyfacts');
    expect(product?.category).toBe('beauty');
  });

  it('retries a 12-digit UPC with a leading zero on Open Beauty Facts', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('/0737052002195.json') && String(url).includes('openbeautyfacts.org')) {
        return new Response(
          JSON.stringify({
            status: 1,
            product: {
              code: '0737052002195',
              product_name: 'Lip balm',
              ingredients_text: 'Beeswax',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ status: 0 }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const product = await fetchProductByBarcode('737052002195');
    expect(product?.name).toBe('Lip balm');
    expect(product?.source).toBe('openbeautyfacts');
  });

  it('still queries Open Products Facts when food and beauty miss', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('openproductsfacts.org')) {
        return new Response(
          JSON.stringify({
            status: 1,
            product: {
              code: '8717644231180',
              product_name: 'Domestos WC gel',
              brands: 'Domestos',
              ingredients_text: 'Sodium hypochlorite 4.5%',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (String(url).includes('openbeautyfacts.org')) {
        throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
      }
      return new Response(JSON.stringify({ status: 0 }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const product = await fetchProductByBarcode('8717644231180');
    expect(product?.name).toBe('Domestos WC gel');
    expect(product?.source).toBe('openproductsfacts');
    expect(product?.category).toBe('household');
  });
});
