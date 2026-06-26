import type { AllergenRecord } from '../allergen-database';

export type CrossReactionRisk = 'high' | 'medium' | 'low';

export type CrossReactionSyndrome =
  | 'oas'
  | 'latex-fruit'
  | 'pollen-food'
  | 'tropomyosin'
  | 'legume'
  | 'cereal'
  | 'animal-protein';

export interface CrossReaction {
  fromId: string;
  toId: string;
  note: string;
  risk?: CrossReactionRisk;
  protein?: string;
  syndrome?: CrossReactionSyndrome;
  clinicalFrequency?: string;
}

export interface CrossReactionMatch {
  allergen: AllergenRecord;
  note: string;
  risk?: CrossReactionRisk;
  protein?: string;
  syndrome?: CrossReactionSyndrome;
  clinicalFrequency?: string;
}

export const CROSS_REACTION_RISK_ORDER: Record<CrossReactionRisk, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function compareCrossReactionRisk(
  left?: CrossReactionRisk,
  right?: CrossReactionRisk,
): number {
  return (
    (CROSS_REACTION_RISK_ORDER[left ?? 'low'] ?? 2) -
    (CROSS_REACTION_RISK_ORDER[right ?? 'low'] ?? 2)
  );
}

export function pickHigherRiskReaction(
  left: CrossReaction,
  right: CrossReaction,
): CrossReaction {
  return compareCrossReactionRisk(left.risk, right.risk) <= 0 ? left : right;
}
