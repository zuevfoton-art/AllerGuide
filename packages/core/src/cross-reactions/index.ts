import { findAllergenById } from '../allergen-database';
import { resolveAllergenId } from '../profile-allergens';
import { CROSS_REACTIONS_PHASE_1 } from './phase-1';
import { CROSS_REACTIONS_PHASE_2 } from './phase-2';
import { CROSS_REACTIONS_PHASE_3 } from './phase-3';
import {
  compareCrossReactionRisk,
  type CrossReaction,
  type CrossReactionMatch,
} from './types';

export {
  compareCrossReactionRisk,
  CROSS_REACTION_RISK_ORDER,
  pickHigherRiskReaction,
  type CrossReaction,
  type CrossReactionMatch,
  type CrossReactionRisk,
  type CrossReactionSyndrome,
} from './types';

export const CROSS_REACTIONS: CrossReaction[] = [
  ...CROSS_REACTIONS_PHASE_1,
  ...CROSS_REACTIONS_PHASE_2,
  ...CROSS_REACTIONS_PHASE_3,
];

function toMatch(reaction: CrossReaction, allergenId: string): CrossReactionMatch | null {
  const otherId = reaction.fromId === allergenId ? reaction.toId : reaction.fromId;
  const allergen = findAllergenById(otherId);
  if (!allergen) return null;

  return {
    allergen,
    note: reaction.note,
    risk: reaction.risk,
    protein: reaction.protein,
    syndrome: reaction.syndrome,
    clinicalFrequency: reaction.clinicalFrequency,
  };
}

export function getCrossReactionsFor(allergenId: string): CrossReactionMatch[] {
  const related = CROSS_REACTIONS.filter(
    (item) => item.fromId === allergenId || item.toId === allergenId,
  );

  const matches: CrossReactionMatch[] = [];

  for (const reaction of related) {
    const match = toMatch(reaction, allergenId);
    if (match) matches.push(match);
  }

  return matches.sort((left, right) => compareCrossReactionRisk(left.risk, right.risk));
}

export function getCrossReactionsForSelection(selected: string[]): CrossReactionMatch[] {
  const selectedIds = [
    ...new Set(selected.map((value) => resolveAllergenId(value)).filter((id): id is string => Boolean(id))),
  ];
  const selectedIdSet = new Set(selectedIds);
  const selectedNames = new Set(selected.map((value) => value.trim()));

  const bestByAllergenId = new Map<string, CrossReactionMatch>();

  for (const id of selectedIds) {
    for (const match of getCrossReactionsFor(id)) {
      if (selectedIdSet.has(match.allergen.id) || selectedNames.has(match.allergen.name)) continue;

      const existing = bestByAllergenId.get(match.allergen.id);
      if (!existing || compareCrossReactionRisk(match.risk, existing.risk) < 0) {
        bestByAllergenId.set(match.allergen.id, match);
      }
    }
  }

  return Array.from(bestByAllergenId.values()).sort((left, right) =>
    compareCrossReactionRisk(left.risk, right.risk),
  );
}
