import type { AllergyConditionId } from './allergy-conditions';
import { resolveConditionOptionsToAllergenIds } from './condition-allergen-map';

/** Selected sub-options per condition type (FR-PROF-03). */
export type ConditionOptionSelections = Partial<Record<AllergyConditionId, string[]>>;

/** Resolve all option chips to canonical allergen ids (deduped). */
export function allergenIdsFromConditionOptions(
  selections: ConditionOptionSelections,
): string[] {
  const ids = new Set<string>();
  for (const [conditionId, optionIds] of Object.entries(selections) as Array<
    [AllergyConditionId, string[] | undefined]
  >) {
    if (!optionIds?.length) continue;
    for (const allergenId of resolveConditionOptionsToAllergenIds(conditionId, optionIds)) {
      ids.add(allergenId);
    }
  }
  return [...ids];
}

/**
 * Re-apply option pre-seed without wiping manually picked allergens:
 * drop ids that were only in the previous seed, then union the next seed.
 */
export function mergePreSeededAllergens(
  currentSelected: string[],
  previousSeedIds: string[],
  nextSeedIds: string[],
): string[] {
  const previousSeed = new Set(previousSeedIds);
  const nextSeed = new Set(nextSeedIds);
  const kept = currentSelected.filter((id) => !previousSeed.has(id) || nextSeed.has(id));
  return [...new Set([...kept, ...nextSeedIds])];
}

/** Drop option selections for conditions that are no longer selected. */
export function reconcileConditionOptionSelections(
  conditionIds: AllergyConditionId[],
  selections: ConditionOptionSelections,
): ConditionOptionSelections {
  const allowed = new Set(conditionIds);
  const next: ConditionOptionSelections = {};
  for (const [conditionId, optionIds] of Object.entries(selections) as Array<
    [AllergyConditionId, string[] | undefined]
  >) {
    if (!allowed.has(conditionId) || !optionIds?.length) continue;
    next[conditionId] = [...optionIds];
  }
  return next;
}

export function toggleConditionOptionId(
  selections: ConditionOptionSelections,
  conditionId: AllergyConditionId,
  optionId: string,
): ConditionOptionSelections {
  const current = selections[conditionId] ?? [];
  const nextOptions = current.includes(optionId)
    ? current.filter((id) => id !== optionId)
    : [...current, optionId];

  const next: ConditionOptionSelections = { ...selections };
  if (nextOptions.length === 0) {
    delete next[conditionId];
  } else {
    next[conditionId] = nextOptions;
  }
  return next;
}
