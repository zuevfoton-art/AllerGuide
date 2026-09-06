import { getConditionType, type AllergyConditionId } from './allergy-conditions';
import { findAllergenById, getAllAllergens, getPopularAllergens, type AllergenRecord } from './allergen-database';
import type { ProfileAllergenId } from './profile-allergens';

export interface AllergenRecommendationGroup {
  conditionId: AllergyConditionId;
  label: string;
  allergens: AllergenRecord[];
}

/**
 * Quick-pick allergen ids per condition type (catalog rows only).
 * Option→id mapping stays in `condition-allergen-map.ts`; this table is the
 * onboarding chip set when the type has no options (asthma, rhinitis, …).
 */
export const CONDITION_RECOMMENDED_ALLERGEN_IDS: Record<AllergyConditionId, ProfileAllergenId[]> = {
  food: ['milk', 'eggs', 'wheat-gluten', 'tree-nuts', 'peanut', 'fish', 'seafood', 'soy'],
  pollinosis: [
    'birch-pollen',
    'alder-pollen',
    'grass-pollen',
    'mugwort-pollen',
    'ragweed-pollen',
    'olive-pollen',
    'hazel-pollen',
    'oak-pollen',
    'ash-pollen',
    'saltwort-pollen',
    'maple-pollen',
    'poplar-pollen',
    'willow-pollen',
  ],
  asthma: [
    'dust-mites',
    'house-dust',
    'mold',
    'cat-dander',
    'dog-dander',
    'birch-pollen',
    'grass-pollen',
    'mugwort-pollen',
  ],
  rhinitis: [
    'dust-mites',
    'house-dust',
    'cat-dander',
    'dog-dander',
    'mold',
    'birch-pollen',
    'grass-pollen',
    'mugwort-pollen',
  ],
  dermatitis: ['dust-mites', 'milk', 'eggs', 'wheat-gluten', 'cat-dander', 'mold'],
  urticaria: ['nsaid', 'aspirin', 'penicillin', 'fish', 'seafood', 'peanut', 'latex'],
  household: ['dust-mites', 'house-dust', 'mold'],
  animal: ['cat-dander', 'dog-dander', 'rodent', 'bird', 'horse', 'rabbit'],
  drug: ['penicillin', 'cephalosporins', 'nsaid', 'aspirin', 'paracetamol'],
  insect: ['bee-venom', 'wasp-venom', 'hornet-venom', 'mosquito'],
  other: [],
};

function indexCatalog(catalog?: AllergenRecord[]): Map<string, AllergenRecord> {
  const source = catalog ?? getAllAllergens();
  return new Map(source.map((item) => [item.id, item]));
}

function resolveKnownAllergens(
  ids: ProfileAllergenId[],
  catalogById: Map<string, AllergenRecord>,
): AllergenRecord[] {
  const resolved: AllergenRecord[] = [];
  for (const id of ids) {
    const record = catalogById.get(id);
    if (record) resolved.push(record);
  }
  return resolved;
}

/** True when the chip row should stay on the static popular list (S4). */
export function shouldUsePopularAllergenFallback(conditionIds: AllergyConditionId[]): boolean {
  if (conditionIds.length === 0) return true;
  return conditionIds.every((id) => (CONDITION_RECOMMENDED_ALLERGEN_IDS[id] ?? []).length === 0);
}

/**
 * Grouped recommendations in selection order. Duplicates stay in the first
 * group only. Empty result means the UI should render popular allergens.
 */
export function getRecommendedAllergensForConditions(
  conditionIds: AllergyConditionId[],
  catalog?: AllergenRecord[],
): AllergenRecommendationGroup[] {
  if (shouldUsePopularAllergenFallback(conditionIds)) return [];

  const catalogById = indexCatalog(catalog);
  const seen = new Set<ProfileAllergenId>();
  const groups: AllergenRecommendationGroup[] = [];

  for (const conditionId of conditionIds) {
    const recommendedIds = CONDITION_RECOMMENDED_ALLERGEN_IDS[conditionId] ?? [];
    if (recommendedIds.length === 0) continue;

    const allergens: AllergenRecord[] = [];
    for (const allergenId of recommendedIds) {
      if (seen.has(allergenId)) continue;
      const record = catalogById.get(allergenId);
      if (!record) continue;
      seen.add(allergenId);
      allergens.push(record);
    }

    if (allergens.length === 0) continue;
    groups.push({
      conditionId,
      label: getConditionType(conditionId)?.label ?? conditionId,
      allergens,
    });
  }

  return groups;
}

/** Flat unique ids for «from catalog» extras and analytics. Falls back to popular. */
export function getRecommendedAllergenIds(
  conditionIds: AllergyConditionId[],
  catalog?: AllergenRecord[],
): ProfileAllergenId[] {
  const groups = getRecommendedAllergensForConditions(conditionIds, catalog);
  if (groups.length > 0) {
    return groups.flatMap((group) => group.allergens.map((item) => item.id));
  }

  const popularIds = getPopularAllergens().map((item) => item.id);
  const fromCatalog = resolveKnownAllergens(popularIds, indexCatalog(catalog));
  if (fromCatalog.length > 0) return fromCatalog.map((item) => item.id);
  return popularIds;
}

/** Debug helper: ids listed in the table that are missing from the catalog. */
export function listUnknownRecommendedAllergenIds(): ProfileAllergenId[] {
  const unknown: ProfileAllergenId[] = [];
  for (const ids of Object.values(CONDITION_RECOMMENDED_ALLERGEN_IDS)) {
    for (const id of ids) {
      if (!findAllergenById(id) && !unknown.includes(id)) unknown.push(id);
    }
  }
  return unknown;
}
