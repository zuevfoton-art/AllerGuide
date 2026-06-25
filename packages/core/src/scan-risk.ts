import { findAllergenById } from './allergen-database';
import type { CrossReactionRisk, CrossReactionSyndrome } from './cross-reactions/types';
import { getFoodAllergenIds, type ProfileAllergenId } from './profile-allergens';
import type { RiskLevel } from './types';

export type ScanMatchKind = 'direct' | 'cross' | 'trace' | 'unknown';

export interface ScanMatch {
  kind: ScanMatchKind;
  allergenId: string;
  label: string;
  syndrome?: CrossReactionSyndrome;
  risk?: CrossReactionRisk;
  confidence: 'high' | 'medium' | 'low';
}

const OAS_SYNDROMES = new Set<CrossReactionSyndrome>(['oas', 'pollen-food']);

export function isOasSyndrome(syndrome?: CrossReactionSyndrome): boolean {
  return syndrome != null && OAS_SYNDROMES.has(syndrome);
}

function isFoodAllergenId(allergenId: string): boolean {
  return findAllergenById(allergenId)?.category === 'food';
}

function isProfileFoodAllergen(allergenId: string, profileAllergenIds: ProfileAllergenId[]): boolean {
  const foodIds = new Set(getFoodAllergenIds(profileAllergenIds));
  return foodIds.has(allergenId);
}

/**
 * Clinical risk level from structured scan matches (D.1 + D.3).
 * True food-allergy direct hits → high; OAS / pollen-food cross → medium cap.
 */
export function computeScanRiskLevel(
  matches: ScanMatch[],
  profileAllergenIds: ProfileAllergenId[] = [],
): RiskLevel {
  const directFood = matches.filter(
    (m) =>
      m.kind === 'direct' &&
      isFoodAllergenId(m.allergenId) &&
      isProfileFoodAllergen(m.allergenId, profileAllergenIds),
  );
  const directOther = matches.filter((m) => m.kind === 'direct' && !directFood.includes(m));
  const crossOas = matches.filter((m) => m.kind === 'cross' && isOasSyndrome(m.syndrome));
  const crossHigh = matches.filter(
    (m) => m.kind === 'cross' && m.risk === 'high' && !isOasSyndrome(m.syndrome),
  );
  const crossOther = matches.filter(
    (m) => m.kind === 'cross' && !crossOas.includes(m) && !crossHigh.includes(m),
  );
  const traces = matches.filter((m) => m.kind === 'trace');
  const unknowns = matches.filter((m) => m.kind === 'unknown');

  if (
    directFood.length >= 2 ||
    (directFood.length >= 1 && crossHigh.length >= 1) ||
    directFood.length >= 1
  ) {
    return 'high';
  }

  if (directOther.length >= 2 || (directOther.length >= 1 && crossHigh.length >= 1)) {
    return 'high';
  }

  if (directOther.length >= 1 || crossHigh.length >= 1) return 'medium';
  if (crossOas.length >= 1 || crossOther.length >= 1) return 'medium';

  const profileFoodIds = new Set(getFoodAllergenIds(profileAllergenIds));
  const relevantTraces = traces.filter((m) => profileFoodIds.has(m.allergenId));
  if (relevantTraces.length >= 2) return 'medium';
  if (relevantTraces.length >= 1) return 'medium';

  if (traces.length >= 1 || unknowns.length >= 1) return 'low';

  return 'low';
}

export function formatCrossMatchLabel(label: string, crossSuffix = '(перекр. реакция)'): string {
  return `${label} ${crossSuffix}`;
}

export function formatTraceMatchLabel(label: string, traceSuffix = '(следы / may contain)'): string {
  return `${label} ${traceSuffix}`;
}

export function scanMatchesToLegacyLists(matches: ScanMatch[], crossSuffix?: string, traceSuffix?: string) {
  const direct: string[] = [];
  const cross: string[] = [];
  const trace: string[] = [];
  const unknown: string[] = [];

  for (const match of matches) {
    switch (match.kind) {
      case 'direct':
        direct.push(match.label);
        break;
      case 'cross':
        cross.push(formatCrossMatchLabel(match.label, crossSuffix));
        break;
      case 'trace':
        trace.push(formatTraceMatchLabel(match.label, traceSuffix));
        break;
      case 'unknown':
        unknown.push(match.label);
        break;
    }
  }

  return { matches: direct, crossMatches: cross, traceMatches: trace, unknownMatches: unknown };
}

export function buildScanVerdict(
  level: RiskLevel,
  matches: ScanMatch[],
  crossSuffix?: string,
  traceSuffix?: string,
): { verdict: string; reason: string; productSuffix?: string } {
  const { matches: direct, crossMatches, traceMatches } = scanMatchesToLegacyLists(
    matches,
    crossSuffix,
    traceSuffix,
  );

  if (level === 'high') {
    const parts = [...direct, ...crossMatches, ...traceMatches];
    return {
      verdict: 'Выявлено множество совпадений',
      reason: `Обнаружены значимые совпадения: ${parts.join(', ')}.`,
    };
  }

  if (level === 'medium') {
    const label = direct[0] ?? crossMatches[0] ?? traceMatches[0] ?? '';
    const hasDirect = direct.length > 0;
    const hasCross = crossMatches.length > 0;
    return {
      verdict: hasDirect
        ? 'Есть совпадения'
        : hasCross
          ? 'Возможна перекрёстная реакция'
          : 'Возможны следы аллергена',
      reason: `Обнаружено потенциально значимое совпадение: ${label}.`,
    };
  }

  const caution =
    traceMatches.length > 0
      ? ` Указаны следы: ${traceMatches.join(', ')}.`
      : '';

  return {
    verdict: 'Нет явных совпадений',
    reason: `Явных пересечений с аллергенами профиля не найдено, но это не исключает индивидуальной реакции.${caution}`,
  };
}
