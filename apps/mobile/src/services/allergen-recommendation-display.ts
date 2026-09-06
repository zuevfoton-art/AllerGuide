import {
  getPopularAllergens,
  getRecommendedAllergensForConditions,
  type AllergenRecommendationGroup,
  type AllergenRecord,
  type AllergyConditionId,
} from '@allerguide/core';

export type AllergenPickerMode = 'recommended' | 'popular';

/** First-pass chip count per condition group before «Show more». */
export const ALLERGEN_GROUP_VISIBLE_LIMIT = 8;

export interface AllergenPickerGroupView extends AllergenRecommendationGroup {
  visibleAllergens: AllergenRecord[];
  hiddenCount: number;
}

export interface AllergenPickerModel {
  mode: AllergenPickerMode;
  groups: AllergenPickerGroupView[];
  popularAllergens: AllergenRecord[];
  extraSelectedIds: string[];
  recommendedCount: number;
  catalogCount: number;
}

export function foldRecommendedGroup(
  group: AllergenRecommendationGroup,
  selected: string[],
  visibleLimit = ALLERGEN_GROUP_VISIBLE_LIMIT,
): AllergenPickerGroupView {
  const selectedSet = new Set(selected);
  const visibleAllergens: AllergenRecord[] = [];
  let hiddenCount = 0;

  for (const allergen of group.allergens) {
    const keepSelectedVisible = selectedSet.has(allergen.id);
    if (visibleAllergens.length < visibleLimit || keepSelectedVisible) {
      visibleAllergens.push(allergen);
    } else {
      hiddenCount += 1;
    }
  }

  return { ...group, visibleAllergens, hiddenCount };
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
  visibleLimit?: number;
}): AllergenPickerModel {
  const groups = getRecommendedAllergensForConditions(input.conditionIds ?? [], input.catalog).map(
    (group) => foldRecommendedGroup(group, input.selected, input.visibleLimit),
  );
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
