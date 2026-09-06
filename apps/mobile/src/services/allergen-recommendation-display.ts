import {
  getPopularAllergens,
  getRecommendedAllergensForConditions,
  type AllergenRecommendationGroup,
  type AllergenRecord,
  type AllergyConditionId,
} from '@allerguide/core';

export type AllergenPickerMode = 'recommended' | 'popular';

export interface AllergenPickerModel {
  mode: AllergenPickerMode;
  groups: AllergenRecommendationGroup[];
  popularAllergens: AllergenRecord[];
  extraSelectedIds: string[];
  recommendedCount: number;
  catalogCount: number;
}

function filterByCatalog(allergens: AllergenRecord[], catalog?: AllergenRecord[]): AllergenRecord[] {
  if (!catalog) return allergens;
  const known = new Set(catalog.map((item) => item.id));
  return allergens.filter((item) => known.has(item.id));
}

/**
 * View-model for AllergenPicker: recommended groups vs popular fallback,
 * plus selected ids that live only in the full catalog (S5).
 */
export function buildAllergenPickerModel(input: {
  selected: string[];
  conditionIds?: AllergyConditionId[];
  catalog?: AllergenRecord[];
}): AllergenPickerModel {
  const groups = getRecommendedAllergensForConditions(input.conditionIds ?? [], input.catalog);
  const mode: AllergenPickerMode = groups.length > 0 ? 'recommended' : 'popular';
  const popularAllergens = filterByCatalog(getPopularAllergens(), input.catalog);
  const quickPickIds = new Set(
    mode === 'recommended'
      ? groups.flatMap((group) => group.allergens.map((item) => item.id))
      : popularAllergens.map((item) => item.id),
  );
  const extraSelectedIds = input.selected.filter((id) => !quickPickIds.has(id));

  return {
    mode,
    groups,
    popularAllergens,
    extraSelectedIds,
    recommendedCount: input.selected.filter((id) => quickPickIds.has(id)).length,
    catalogCount: extraSelectedIds.length,
  };
}
