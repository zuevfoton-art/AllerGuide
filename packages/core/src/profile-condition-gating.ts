import type { AllergyConditionId } from './allergy-conditions';

/** Conditions whose removal affects diary modules, scales, or clinical flows — confirm with user. */
export const GATED_CONDITION_REMOVAL_IDS: readonly AllergyConditionId[] = [
  'asthma',
  'insect',
  'dermatitis',
  'pollinosis',
  'rhinitis',
  'household',
  'animal',
];

export function isGatedConditionRemoval(conditionId: AllergyConditionId): boolean {
  return (GATED_CONDITION_REMOVAL_IDS as readonly string[]).includes(conditionId);
}

export function getGatedConditionRemovals(
  previous: AllergyConditionId[],
  next: AllergyConditionId[],
): AllergyConditionId[] {
  const nextSet = new Set(next);
  return previous.filter((id) => !nextSet.has(id) && isGatedConditionRemoval(id));
}

export function hasGatedConditionRemovals(
  previous: AllergyConditionId[],
  next: AllergyConditionId[],
): boolean {
  return getGatedConditionRemovals(previous, next).length > 0;
}
