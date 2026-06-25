import { describe, expect, it } from 'vitest';
import { filterProductsForProfile, parseProfileAllergens } from './catalog';

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
});
