import { describe, expect, it } from 'vitest';
import {
  isCalendarOnlyPollenOption,
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

  it('maps insect options to specific venom allergen ids', () => {
    expect(resolveConditionOptionAllergenId('insect', 'bee')).toBe('bee-venom');
    expect(resolveConditionOptionAllergenId('insect', 'wasp')).toBe('wasp-venom');
    expect(resolveConditionOptionAllergenId('insect', 'hornet')).toBe('hornet-venom');
    expect(resolveConditionOptionAllergenId('insect', 'mosquito')).toBe('mosquito');
  });

  it('maps animal rodent, bird, horse, rabbit to catalog ids', () => {
    expect(resolveConditionOptionAllergenId('animal', 'rodent')).toBe('rodent');
    expect(resolveConditionOptionAllergenId('animal', 'bird')).toBe('bird');
    expect(resolveConditionOptionAllergenId('animal', 'horse')).toBe('horse');
    expect(resolveConditionOptionAllergenId('animal', 'rabbit')).toBe('rabbit');
  });

  it('maps drug options to medication allergen ids', () => {
    expect(resolveConditionOptionAllergenId('drug', 'penicillin')).toBe('penicillin');
    expect(resolveConditionOptionAllergenId('drug', 'nsaid')).toBe('nsaid');
    expect(resolveConditionOptionAllergenId('drug', 'cephalosporins')).toBe('cephalosporins');
    expect(resolveConditionOptionAllergenId('drug', 'paracetamol')).toBe('paracetamol');
  });

  it('returns null for calendar-only pollinosis options without allergen row', () => {
    expect(resolveConditionOptionAllergenId('pollinosis', 'alder')).toBeNull();
    expect(resolveConditionOptionPollenTaxonId('pollinosis', 'alder')).toBe('alder_pollen');
    expect(resolveConditionOptionPollenTaxonId('pollinosis', 'hazel')).toBe('hazel_pollen');
    expect(resolveConditionOptionPollenTaxonId('pollinosis', 'maple')).toBe('maple_pollen');
    expect(isCalendarOnlyPollenOption('oak')).toBe(true);
    expect(isCalendarOnlyPollenOption('birch-pollen')).toBe(false);
  });

  it('deduplicates allergen ids from multiple grass options', () => {
    expect(
      resolveConditionOptionsToAllergenIds('pollinosis', ['timothy', 'meadow', 'fescue']),
    ).toEqual(['grass-pollen']);
  });
});
