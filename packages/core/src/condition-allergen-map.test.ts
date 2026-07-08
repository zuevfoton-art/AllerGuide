import { describe, expect, it } from 'vitest';
import {
  normalizeConditionOptionId,
  resolveConditionOptionAllergenId,
  resolveConditionOptionPollenTaxonId,
  resolveConditionOptionsToAllergenIds,
} from './condition-allergen-map';

describe('condition-allergen-map', () => {
  it('maps food wheat-gluten option to allergen id', () => {
    expect(resolveConditionOptionAllergenId('food', 'wheat-gluten')).toBe('wheat-gluten');
  });

  it('resolves legacy food wheat alias', () => {
    expect(resolveConditionOptionAllergenId('food', 'wheat')).toBe('wheat-gluten');
    expect(normalizeConditionOptionId('food', 'wheat')).toBe('wheat-gluten');
  });

  it('maps pollinosis birch-pollen to allergen and taxon', () => {
    expect(resolveConditionOptionAllergenId('pollinosis', 'birch-pollen')).toBe('birch-pollen');
    expect(resolveConditionOptionAllergenId('pollinosis', 'birch')).toBe('birch-pollen');
    expect(resolveConditionOptionPollenTaxonId('pollinosis', 'birch-pollen')).toBe('birch_pollen');
  });

  it('maps household house-dust and legacy dust alias', () => {
    expect(resolveConditionOptionAllergenId('household', 'house-dust')).toBe('house-dust');
    expect(resolveConditionOptionAllergenId('household', 'dust')).toBe('house-dust');
  });

  it('maps animal cat-dander and legacy cat alias', () => {
    expect(resolveConditionOptionAllergenId('animal', 'cat-dander')).toBe('cat-dander');
    expect(resolveConditionOptionAllergenId('animal', 'cat')).toBe('cat-dander');
  });

  it('maps insect options to insect-stings aggregate', () => {
    expect(resolveConditionOptionAllergenId('insect', 'bee')).toBe('insect-stings');
    expect(resolveConditionOptionAllergenId('insect', 'wasp')).toBe('insect-stings');
  });

  it('returns null for calendar-only pollinosis options without allergen row', () => {
    expect(resolveConditionOptionAllergenId('pollinosis', 'alder')).toBeNull();
    expect(resolveConditionOptionPollenTaxonId('pollinosis', 'alder')).toBe('alder_pollen');
  });

  it('deduplicates allergen ids from multiple grass options', () => {
    expect(
      resolveConditionOptionsToAllergenIds('pollinosis', ['timothy', 'meadow', 'fescue']),
    ).toEqual(['grass-pollen']);
  });
});
