import { describe, expect, it } from 'vitest';
import { ALLERGENS, getPopularAllergens, type AllergenRecord } from './allergen-database';
import { ALLERGY_CONDITION_TYPES, type AllergyConditionId } from './allergy-conditions';
import { CONDITION_OPTION_ALLERGEN_MAP } from './condition-allergen-map';
import {
  CONDITION_RECOMMENDED_ALLERGEN_IDS,
  getRecommendedAllergenIds,
  getRecommendedAllergensForConditions,
  listUnknownRecommendedAllergenIds,
  shouldUsePopularAllergenFallback,
} from './condition-allergen-recommendations';

function stubRecord(id: string): AllergenRecord {
  return {
    id,
    name: id,
    category: 'environmental',
    popular: false,
    keywords: [],
  };
}

describe('condition-allergen-recommendations', () => {
  it('covers every AllergyConditionId', () => {
    const tableIds = Object.keys(CONDITION_RECOMMENDED_ALLERGEN_IDS).sort();
    const taxonomyIds = ALLERGY_CONDITION_TYPES.map((item) => item.id).sort();
    expect(tableIds).toEqual(taxonomyIds);
  });

  it('lists only allergen ids that exist in the catalog', () => {
    expect(listUnknownRecommendedAllergenIds()).toEqual([]);
    for (const ids of Object.values(CONDITION_RECOMMENDED_ALLERGEN_IDS)) {
      for (const id of ids) {
        expect(ALLERGENS.some((item) => item.id === id), id).toBe(true);
      }
    }
  });

  it('does not contradict CONDITION_OPTION_ALLERGEN_MAP where a map exists', () => {
    for (const [conditionId, optionMap] of Object.entries(CONDITION_OPTION_ALLERGEN_MAP) as Array<
      [AllergyConditionId, Record<string, string>]
    >) {
      const recommended = new Set(CONDITION_RECOMMENDED_ALLERGEN_IDS[conditionId]);
      for (const allergenId of new Set(Object.values(optionMap))) {
        expect(recommended.has(allergenId), `${conditionId} missing ${allergenId}`).toBe(true);
      }
    }
  });

  it('keeps milk first for food so Maestro allergen-milk stays on the first-run path', () => {
    expect(CONDITION_RECOMMENDED_ALLERGEN_IDS.food[0]).toBe('milk');
  });

  it('recommends birch and mugwort pollen for pollinosis (S1)', () => {
    const ids = getRecommendedAllergenIds(['pollinosis']);
    expect(ids).toEqual([
      'birch-pollen',
      'alder-pollen',
      'grass-pollen',
      'mugwort-pollen',
      'ragweed-pollen',
      'olive-pollen',
    ]);
    expect(ids).toContain('birch-pollen');
    expect(ids).toContain('mugwort-pollen');
  });

  it('recommends dust mites for asthma and rhinitis (S2)', () => {
    expect(getRecommendedAllergenIds(['asthma'])).toContain('dust-mites');
    expect(getRecommendedAllergenIds(['rhinitis'])).toContain('dust-mites');
  });

  it('groups in selection order and dedupes birch across pollinosis + asthma (S3)', () => {
    const groups = getRecommendedAllergensForConditions(['pollinosis', 'asthma']);
    expect(groups.map((group) => group.conditionId)).toEqual(['pollinosis', 'asthma']);
    expect(groups[0]?.allergens.map((item) => item.id)).toContain('birch-pollen');
    expect(groups[1]?.allergens.map((item) => item.id)).not.toContain('birch-pollen');
    expect(getRecommendedAllergenIds(['pollinosis', 'asthma']).filter((id) => id === 'birch-pollen')).toHaveLength(
      1,
    );
  });

  it('falls back to popular allergens for empty input and other-only (S4)', () => {
    const popularIds = getPopularAllergens().map((item) => item.id);
    expect(shouldUsePopularAllergenFallback([])).toBe(true);
    expect(shouldUsePopularAllergenFallback(['other'])).toBe(true);
    expect(shouldUsePopularAllergenFallback(['pollinosis'])).toBe(false);
    expect(getRecommendedAllergensForConditions([])).toEqual([]);
    expect(getRecommendedAllergensForConditions(['other'])).toEqual([]);
    expect(getRecommendedAllergenIds([])).toEqual(popularIds);
    expect(getRecommendedAllergenIds(['other'])).toEqual(popularIds);
  });

  it('drops unknown catalog ids and falls back when none remain', () => {
    const partial = [stubRecord('birch-pollen')];
    const groups = getRecommendedAllergensForConditions(['pollinosis'], partial);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.allergens.map((item) => item.id)).toEqual(['birch-pollen']);

    expect(getRecommendedAllergensForConditions(['pollinosis'], [])).toEqual([]);
    expect(getRecommendedAllergenIds(['pollinosis'], [])).toEqual(
      getPopularAllergens().map((item) => item.id),
    );
  });
});
