import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchOpenFoodFactsProduct, searchOpenFoodFacts } from './open-food-facts';

afterEach(() => {
  vi.restoreAllMocks();
});

function mockJson(body: unknown, ok = true) {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status: ok ? 200 : 404,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('open food facts service', () => {
  it('normalizes a product, enriches brand/image and maps allergens + traces', async () => {
    mockJson({
      status: 1,
      product: {
        code: '3017620422003',
        product_name: 'Nutella',
        brands: 'Ferrero, Nutella',
        image_small_url: 'https://images.openfoodfacts.org/nutella.jpg',
        ingredients_text: 'sugar, palm oil, hazelnuts, milk',
        allergens_tags: ['en:milk', 'en:nuts'],
        traces_tags: ['en:soybeans'],
      },
    });

    const product = await fetchOpenFoodFactsProduct('3017620422003');
    expect(product).not.toBeNull();
    expect(product!.name).toBe('Nutella');
    expect(product!.brand).toBe('Ferrero');
    expect(product!.imageUrl).toContain('nutella.jpg');
    // declared allergens and traces are kept separate
    expect(product!.allergenTags).toEqual(['milk', 'tree-nuts']);
    expect(product!.traceTags).toEqual(['soy']);
  });

  it('sends a descriptive User-Agent header (OFF requirement)', async () => {
    const fetchMock = mockJson({ status: 1, product: { code: '1', product_name: 'X' } });
    await fetchOpenFoodFactsProduct('1');
    const call = fetchMock.mock.calls[0] as unknown as [string, { headers: Record<string, string> }];
    expect(call[1].headers['User-Agent']).toMatch(/AllerGuide/);
  });

  it('returns null when the product is not found', async () => {
    mockJson({ status: 0 });
    expect(await fetchOpenFoodFactsProduct('0000000000000')).toBeNull();
  });

  it('searches products on demand and de-duplicates by barcode', async () => {
    mockJson({
      products: [
        { code: '111', product_name: 'Молоко 1', allergens_tags: ['en:milk'] },
        { code: '111', product_name: 'Молоко 1 dup' },
        { code: '222', product_name: 'Сыр', allergens_tags: ['en:milk'] },
      ],
    });

    const results = await searchOpenFoodFacts('молоко');
    expect(results.map((p) => p.barcode)).toEqual(['111', '222']);
    expect(results[0].allergenTags).toEqual(['milk']);
  });

  it('returns an empty array for short queries without calling the API', async () => {
    const fetchMock = mockJson({ products: [] });
    expect(await searchOpenFoodFacts('a')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
