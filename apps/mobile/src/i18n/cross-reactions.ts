import type { CrossReactionMatch, CrossReactionRisk } from '@allerguide/core';
import type { TranslationKey } from '@/src/i18n/translate';

export function crossReactionRiskKey(risk: CrossReactionRisk): TranslationKey {
  if (risk === 'high') return 'allergens.crossRiskHigh';
  if (risk === 'medium') return 'allergens.crossRiskMedium';
  return 'allergens.crossRiskLow';
}

export function formatCrossReactionLabel(
  match: CrossReactionMatch,
  t: (key: TranslationKey) => string,
): string {
  if (!match.risk) return match.allergen.name;
  return `${match.allergen.name} (${t(crossReactionRiskKey(match.risk))})`;
}

export function crossReactionRiskColor(
  risk: CrossReactionRisk | undefined,
  colors: { danger: string; warning: string; textMuted: string },
): string {
  if (risk === 'high') return colors.danger;
  if (risk === 'medium') return colors.warning;
  return colors.textMuted;
}
