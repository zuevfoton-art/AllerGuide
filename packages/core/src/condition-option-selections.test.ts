import { describe, expect, it } from 'vitest';
import {
  allergenIdsFromConditionOptions,
  mergePreSeededAllergens,
  reconcileConditionOptionSelections,
  toggleConditionOptionId,
} from './condition-option-selections';

describe('condition-option-selections', () => {
  it('resolves food/pollinosis options to allergen ids', () => {
    expect(
      allergenIdsFromConditionOptions({
        food: ['milk', 'peanut'],
        pollinosis: ['birch-pollen', 'alder'],
      }),
    ).toEqual(['milk', 'peanut', 'birch-pollen', 'alder-pollen']);
  });

  it('merges pre-seed without removing manual picks', () => {
    expect(mergePreSeededAllergens(['milk', 'eggs'], ['milk'], ['milk', 'peanut'])).toEqual([
      'milk',
      'eggs',
      'peanut',
    ]);
    expect(mergePreSeededAllergens(['milk', 'eggs'], ['milk'], [])).toEqual(['eggs']);
  });

  it('reconciles and toggles option chips', () => {
    const toggled = toggleConditionOptionId({ food: ['milk'] }, 'food', 'peanut');
    expect(toggled.food).toEqual(['milk', 'peanut']);
    expect(reconcileConditionOptionSelections(['pollinosis'], toggled)).toEqual({});
  });
});
