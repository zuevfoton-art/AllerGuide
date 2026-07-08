import type { AllergyConditionId } from './allergy-conditions';
import { ALLERGY_CONDITION_TYPES } from './allergy-conditions';
import { findAllergenById } from './allergen-database';

/**
 * Maps allergy-condition sub-option ids (from `allergy-conditions.ts`) to canonical
 * allergen ids. Unmapped pollen taxa without a dedicated catalog entry are omitted.
 */
export const CONDITION_OPTION_ALLERGEN_IDS: Record<string, string> = {
  milk: 'milk',
  eggs: 'eggs',
  wheat: 'wheat-gluten',
  'tree-nuts': 'tree-nuts',
  fish: 'fish',
  seafood: 'seafood',
  soy: 'soy',
  peanut: 'peanut',
  birch: 'birch-pollen',
  ragweed: 'ragweed-pollen',
  wormwood: 'mugwort-pollen',
  timothy: 'grass-pollen',
  meadow: 'grass-pollen',
  fescue: 'grass-pollen',
  'rye-grass': 'grass-pollen',
  raggrass: 'grass-pollen',
  dust: 'house-dust',
  'dust-mite': 'dust-mites',
  mold: 'mold',
  cat: 'cat-dander',
  dog: 'dog-dander',
  bee: 'insect-stings',
  wasp: 'insect-stings',
  hornet: 'insect-stings',
  mosquito: 'insect-stings',
};

/** Suggested canonical allergen ids for selected profile condition types (FR-PROF-02/03). */
export function getSuggestedAllergenIdsForConditions(
  conditionIds: AllergyConditionId[],
): string[] {
  const ids = new Set<string>();

  for (const conditionId of conditionIds) {
    const condition = ALLERGY_CONDITION_TYPES.find((item) => item.id === conditionId);
    if (!condition?.options?.length) continue;

    for (const option of condition.options) {
      const allergenId = CONDITION_OPTION_ALLERGEN_IDS[option.id];
      if (allergenId && findAllergenById(allergenId)) {
        ids.add(allergenId);
      }
    }
  }

  return [...ids];
}
