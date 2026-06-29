import { describe, expect, it } from 'vitest';
import {
  mapExternalAllergen,
  mapExternalAllergenIds,
  mapExternalAllergenNames,
  mapExternalAllergenToId,
} from './allergen-aliases';

describe('external allergen aliases', () => {
  it('maps dataset English names to the core RU taxonomy', () => {
    expect(mapExternalAllergen('Treenut')?.name).toBe('Орехи');
    expect(mapExternalAllergen('Milk')?.name).toBe('Молоко');
    expect(mapExternalAllergen('Shellfish')?.name).toBe('Морепродукты');
    expect(mapExternalAllergen('Gluten')?.name).toBe('Пшеница / глютен');
    expect(mapExternalAllergen('Egg')?.name).toBe('Яйца');
  });

  it('strips Open Food Facts language prefixes', () => {
    expect(mapExternalAllergen('en:milk')?.name).toBe('Молоко');
    expect(mapExternalAllergen('en:peanuts')?.name).toBe('Арахис');
  });

  it('maps to canonical ids', () => {
    expect(mapExternalAllergenToId('en:milk')).toBe('milk');
    expect(mapExternalAllergenIds(['en:milk', 'en:nuts'])).toEqual(['milk', 'tree-nuts']);
  });

  it('keeps unrecognized terms as-is in names mapper and de-duplicates', () => {
    const result = mapExternalAllergenNames(['Treenut', 'Milk', 'Garlic', 'Milk']);
    expect(result).toEqual(['Орехи', 'Молоко', 'Garlic']);
  });

  it('returns undefined for unknown terms', () => {
    expect(mapExternalAllergen('Tartrazine')).toBeUndefined();
    expect(mapExternalAllergenToId('Tartrazine')).toBeUndefined();
  });
});
