import { getCrossReactionsFor } from './cross-reactions';
import type { CrossReactionMatch, CrossReactionRisk } from './cross-reactions/types';
import type { PollenTierLevel } from './pollen-thresholds';
import { WELLNESS_WEIGHTS } from './wellness-weights';

export interface PollenExposure {
  allergenId: string;
  tier: PollenTierLevel;
}

export interface CrossReactionWellnessResult {
  penalty: number;
  matches: CrossReactionMatch[];
}

const ELEVATED_POLLEN_SYNDROMES = new Set(['oas', 'pollen-food']);

function riskPenalty(risk: CrossReactionRisk | undefined): number {
  return WELLNESS_WEIGHTS.crossReaction[risk ?? 'low'];
}

/**
 * When profile-relevant pollen is elevated, flag pollen-food / OAS cross-reactions (B.6).
 */
export function computeCrossReactionWellnessPenalty(
  profileAllergenIds: string[],
  pollenExposures: PollenExposure[],
): CrossReactionWellnessResult {
  const profileSet = new Set(profileAllergenIds);
  const seen = new Set<string>();
  const matches: CrossReactionMatch[] = [];
  let penalty = 0;

  for (const exposure of pollenExposures) {
    if (exposure.tier === 'low') continue;
    if (!profileSet.has(exposure.allergenId)) continue;

    for (const match of getCrossReactionsFor(exposure.allergenId)) {
      if (!ELEVATED_POLLEN_SYNDROMES.has(match.syndrome ?? '')) continue;
      if (seen.has(match.allergen.id)) continue;
      seen.add(match.allergen.id);

      const matchPenalty = riskPenalty(match.risk);
      penalty += matchPenalty;
      matches.push(match);

      if (profileSet.has(match.allergen.id)) {
        penalty += Math.round(matchPenalty * 0.5);
      }
    }
  }

  return { penalty, matches };
}
