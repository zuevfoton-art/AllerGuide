import { describe, expect, it } from 'vitest';
import {
  OFF_DEFAULT_BASE_URLS,
  OFF_DEFAULT_USER_AGENT,
  OFF_PRODUCT_FIELDS,
  buildOffProductApiUrl,
  buildOffSearchParams,
  buildOffSearchUrl,
  categoryFromOffSource,
  normalizeOffBarcode,
  normalizeOffProduct,
} from './open-food-facts';

describe('open-food-facts', () => {
  it('maps a family source to a catalog category', () => {
    expect(categoryFromOffSource('openfoodfacts')).toBe('food');
    expect(categoryFromOffSource('openbeautyfacts')).toBe('beauty');
    expect(categoryFromOffSource('openproductsfacts')).toBe('household');
  });

  it('keeps only barcode digits', () => {
    expect(normalizeOffBarcode('301 7620-422003')).toBe('3017620422003');
    expect(normalizeOffBarcode('abc')).toBe('');
  });

  it('normalizes a product, prefers RU text, and maps allergens + traces', () => {
    const product = normalizeOffProduct(
      {
        code: '3017620422003',
        product_name: 'Nutella',
        product_name_ru: 'Нутелла',
        brands: 'Ferrero, Nutella',
        ingredients_text: 'sugar, palm oil',
        ingredients_text_ru: 'сахар, пальмовое масло',
        allergens_tags: ['en:milk', 'en:nuts'],
        traces_tags: ['en:soybeans'],
        image_small_url: 'https://images.openfoodfacts.org/nutella-small.jpg',
      },
      'openfoodfacts',
    );

    expect(product).toEqual({
      barcode: '3017620422003',
      name: 'Нутелла',
      brand: 'Ferrero',
      imageUrl: 'https://images.openfoodfacts.org/nutella-small.jpg',
      ingredients: 'сахар, пальмовое масло',
      allergenTags: ['milk', 'tree-nuts'],
      traceTags: ['soy'],
      source: 'openfoodfacts',
      category: 'food',
    });
  });

  it('prefers image_front_small_url, then image_small_url, then image_url', () => {
    const front = normalizeOffProduct(
      {
        code: '1',
        product_name: 'X',
        image_front_small_url: 'https://img/front.jpg',
        image_small_url: 'https://img/small.jpg',
        image_url: 'https://img/full.jpg',
      },
      'openfoodfacts',
    );
    expect(front?.imageUrl).toBe('https://img/front.jpg');

    const small = normalizeOffProduct(
      {
        code: '1',
        product_name: 'X',
        image_small_url: 'https://img/small.jpg',
        image_url: 'https://img/full.jpg',
      },
      'openfoodfacts',
    );
    expect(small?.imageUrl).toBe('https://img/small.jpg');

    const full = normalizeOffProduct(
      { code: '1', product_name: 'X', image_url: 'https://img/full.jpg' },
      'openbeautyfacts',
    );
    expect(full?.imageUrl).toBe('https://img/full.jpg');
    expect(full?.category).toBe('beauty');
  });

  it('uses the fallback barcode and a generated name when only ingredients exist', () => {
    const product = normalizeOffProduct(
      { ingredients_text: 'aqua' },
      'openproductsfacts',
      '3010000000001',
    );
    expect(product?.barcode).toBe('3010000000001');
    expect(product?.name).toBe('Продукт 3010000000001');
    expect(product?.category).toBe('household');
  });

  it('returns null without a barcode or without name and ingredients', () => {
    expect(normalizeOffProduct({ product_name: 'X' }, 'openfoodfacts')).toBeNull();
    expect(normalizeOffProduct({ code: '1' }, 'openfoodfacts')).toBeNull();
  });

  it('builds product and search URLs with the field superset', () => {
    expect(buildOffProductApiUrl(OFF_DEFAULT_BASE_URLS.openfoodfacts, '123')).toBe(
      `https://world.openfoodfacts.org/api/v2/product/123.json?fields=${OFF_PRODUCT_FIELDS}`,
    );
    expect(buildOffProductApiUrl('https://world.openbeautyfacts.org/', '9')).toContain(
      'openbeautyfacts.org/api/v2/product/9.json',
    );

    const params = buildOffSearchParams('молоко', 8, { maxPageSize: 20 });
    expect(params.get('search_terms')).toBe('молоко');
    expect(params.get('page_size')).toBe('8');
    expect(params.get('fields')).toBe(OFF_PRODUCT_FIELDS);

    const clamped = buildOffSearchParams('x', 99, { maxPageSize: 20 });
    expect(clamped.get('page_size')).toBe('20');

    const url = buildOffSearchUrl(OFF_DEFAULT_BASE_URLS.openfoodfacts, 'сыр', 4);
    expect(url).toContain('https://world.openfoodfacts.org/cgi/search.pl?');
    expect(url).toContain('search_terms=%D1%81%D1%8B%D1%80');
  });

  it('exposes the default User-Agent required by OFF', () => {
    expect(OFF_DEFAULT_USER_AGENT).toMatch(/A-Claro/);
    expect(OFF_DEFAULT_USER_AGENT).toContain('support@aclearo.com');
  });
});
