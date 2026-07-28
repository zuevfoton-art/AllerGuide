import { describe, expect, it } from 'vitest';
import {
  CATALOG_PRODUCTS,
  filterProductsForProfile,
  getPrimaryOffer,
  getProductOffers,
  parseProfileAllergens,
  resolveProductBuyUrl,
} from './catalog';

describe('catalog', () => {
  it('parses profile allergens json', () => {
    expect(parseProfileAllergens('["Молоко"]')).toEqual(['Молоко']);
    expect(parseProfileAllergens('["milk"]')).toEqual(['Молоко']);
  });

  it('filters products that contain profile allergens', () => {
    const products = filterProductsForProfile(
      [
        {
          id: 'a',
          title: 'Safe',
          why: 'x',
          icon: 'bed',
          tag: 'Дом',
          colorKey: 'accent',
          forAllergens: [],
          containsAllergens: [],
        },
        {
          id: 'b',
          title: 'Conflict',
          why: 'x',
          icon: 'bed',
          tag: 'Дом',
          colorKey: 'accent',
          forAllergens: [],
          containsAllergens: ['Молоко'],
        },
      ],
      ['Молоко'],
    );

    expect(products).toHaveLength(1);
    expect(products[0]?.id).toBe('a');
  });

  it('seeds at least five curated yandex_market offers', () => {
    const withYandex = CATALOG_PRODUCTS.filter((product) =>
      getProductOffers(product).some((offer) => offer.merchant === 'yandex_market'),
    );
    expect(withYandex.length).toBeGreaterThanOrEqual(5);
  });

  it('prefers yandex_market as primary offer when present', () => {
    const air = CATALOG_PRODUCTS.find((product) => product.id === 'air-purifier');
    expect(air).toBeTruthy();
    const primary = getPrimaryOffer(air!);
    expect(primary?.merchant).toBe('yandex_market');
    expect(resolveProductBuyUrl(air!)).toContain('market.yandex.ru');
  });

  it('falls back to legacy affiliateUrl when offers are missing', () => {
    const offers = getProductOffers({
      id: 'legacy',
      title: 'x',
      why: 'x',
      icon: 'bed',
      tag: 'Дом',
      colorKey: 'accent',
      forAllergens: [],
      containsAllergens: [],
      affiliateUrl: 'https://www.iherb.com/search?kw=test',
    });
    expect(offers).toEqual([
      { merchant: 'iherb', url: 'https://www.iherb.com/search?kw=test' },
    ]);
  });
});
