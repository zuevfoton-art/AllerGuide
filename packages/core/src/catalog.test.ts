import { describe, expect, it } from 'vitest';
import {
  CATALOG_PRODUCTS,
  filterPlacesForProfile,
  filterProductsForProfile,
  getPlaceLevelLabel,
} from './catalog';

describe('filterProductsForProfile', () => {
  it('excludes products containing profile allergens', () => {
    const result = filterProductsForProfile(CATALOG_PRODUCTS, ['Молоко']);
    expect(result.some((p) => p.id === 'hypo-cream')).toBe(false);
    expect(result.some((p) => p.id === 'oat-milk')).toBe(false);
  });

  it('includes universal products when profile has no matching forAllergens', () => {
    const result = filterProductsForProfile(CATALOG_PRODUCTS, ['Яйцо']);
    expect(result.some((p) => p.id === 'epipen-case')).toBe(true);
  });

  it('prefers products relevant to profile allergens', () => {
    const result = filterProductsForProfile(CATALOG_PRODUCTS, ['Пыль клещей']);
    expect(result.some((p) => p.id === 'bed-covers')).toBe(true);
  });
});

describe('filterPlacesForProfile', () => {
  it('sorts high safety places first when profile has allergens', () => {
    const result = filterPlacesForProfile(
      [
        {
          id: 'a',
          title: 'Low',
          note: '',
          level: 'low',
          icon: 'restaurant',
          lat: 0,
          lng: 0,
          tags: [],
        },
        {
          id: 'b',
          title: 'High',
          note: '',
          level: 'high',
          icon: 'leaf',
          lat: 0,
          lng: 0,
          tags: [],
        },
      ],
      ['Молоко'],
    );
    expect(result[0]?.level).toBe('high');
  });

  it('returns all places when profile allergens empty', () => {
    const places = filterPlacesForProfile(
      [
        {
          id: 'a',
          title: 'A',
          note: '',
          level: 'medium',
          icon: 'restaurant',
          lat: 0,
          lng: 0,
          tags: [],
        },
      ],
      [],
    );
    expect(places).toHaveLength(1);
  });
});

describe('getPlaceLevelLabel', () => {
  it('maps levels to Russian labels', () => {
    expect(getPlaceLevelLabel('high')).toBe('Высокий');
    expect(getPlaceLevelLabel('medium')).toBe('Средний');
    expect(getPlaceLevelLabel('low')).toBe('Низкий');
  });
});
