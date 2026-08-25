import { describe, expect, it } from 'vitest';
import { hasStrongLocalProductMatch, rankLocalCatalogProducts } from './product-search-rank';

describe('product-search-rank', () => {
  it('drops food-allergy hashes so they cannot block OFF', () => {
    const ranked = rankLocalCatalogProducts(
      [
        { name: '1JNtNyz', source: 'food-allergy-db', allergenTags: ['milk'] },
        { name: 'Spaghetti Bolognese', source: 'openfoodfacts' },
      ],
      'спагетти болоньезе',
    );

    expect(ranked.map((row) => row.name)).toEqual(['Spaghetti Bolognese']);
    expect(
      hasStrongLocalProductMatch(
        [{ name: '1JNtNyz', source: 'food-allergy-db' }],
        'спагетти болоньезе',
      ),
    ).toBe(false);
  });

  it('treats a real title as a strong local hit', () => {
    expect(
      hasStrongLocalProductMatch([{ name: 'борщ домашний', source: 'manual' }], 'борщ'),
    ).toBe(true);
  });
});
