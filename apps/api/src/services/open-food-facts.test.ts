import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchOpenFoodFactsProduct } from './open-food-facts';

afterEach(() => {
  vi.restoreAllMocks();
});

function mockOff(body: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify(body), {
        status: ok ? 200 : 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
}

describe('open food facts service', () => {
  it('normalizes a product and maps allergen tags to the RU taxonomy', async () => {
    mockOff({
      status: 1,
      product: {
        code: '3017620422003',
        product_name: 'Nutella',
        ingredients_text: 'sugar, palm oil, hazelnuts, milk, soy lecithin',
        allergens_tags: ['en:milk', 'en:nuts', 'en:soybeans'],
      },
    });

    const product = await fetchOpenFoodFactsProduct('3017620422003');
    expect(product).not.toBeNull();
    expect(product!.name).toBe('Nutella');
    expect(product!.allergenTags).toEqual(['Молоко', 'Орехи', 'Соя']);
  });

  it('returns null when the product is not found', async () => {
    mockOff({ status: 0 });
    expect(await fetchOpenFoodFactsProduct('0000000000000')).toBeNull();
  });

  it('returns null for an empty barcode', async () => {
    expect(await fetchOpenFoodFactsProduct('   ')).toBeNull();
  });
});
