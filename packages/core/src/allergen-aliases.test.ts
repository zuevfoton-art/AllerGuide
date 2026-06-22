import { describe, expect, it } from 'vitest';
import { mapExternalAllergen, mapExternalAllergenNames } from './allergen-aliases';

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

  it('keeps unrecognized terms as-is and de-duplicates', () => {
    const result = mapExternalAllergenNames(['Treenut', 'Milk', 'Garlic', 'Milk']);
    expect(result).toEqual(['Орехи', 'Молоко', 'Garlic']);
  });

  it('returns undefined for unknown terms', () => {
    expect(mapExternalAllergen('Tartrazine')).toBeUndefined();
  });
});
