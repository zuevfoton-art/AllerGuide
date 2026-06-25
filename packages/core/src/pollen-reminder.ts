import type { OpenMeteoPollenTaxonId } from './pollen-taxonomy';
import { classifyPollenConcentration } from './pollen-thresholds';
import {
  addLocalDays,
  applyQuietHours,
  buildLocalDateTime,
  startOfLocalDay,
  type ScheduledReminderTrigger,
} from './reminder-policy';

export const DEFAULT_POLLEN_REMINDER_HOUR = 7;
export const DEFAULT_POLLEN_REMINDER_MINUTE = 30;

export type PollenAlertThreshold = 'high' | 'moderate';

export interface PollenMatchLike {
  label: string;
  value: number;
  profileRelevant: boolean;
  taxonId?: OpenMeteoPollenTaxonId;
}

export interface PollenAlertEvaluation {
  shouldAlert: boolean;
  primaryLabel?: string;
  primaryLevel?: 'mid' | 'high';
  checkedAt?: string;
}

export function parsePollenAlertThreshold(raw: string | null | undefined): PollenAlertThreshold {
  return raw === 'high' ? 'high' : 'moderate';
}

export function pollenLevelMeetsThreshold(
  level: 'low' | 'mid' | 'high',
  threshold: PollenAlertThreshold,
): boolean {
  if (threshold === 'high') return level === 'high';
  return level === 'mid' || level === 'high';
}

export function evaluatePollenAlert(
  matches: PollenMatchLike[],
  threshold: PollenAlertThreshold,
): PollenAlertEvaluation {
  let best: { label: string; level: 'mid' | 'high' } | null = null;

  for (const match of matches) {
    if (!match.profileRelevant) continue;
    const level = classifyPollenConcentration(match.value, match.taxonId ?? 'birch_pollen');
    if (!pollenLevelMeetsThreshold(level, threshold)) continue;

    const normalized = level === 'high' ? 'high' : 'mid';
    if (!best || normalized === 'high') {
      best = { label: match.label, level: normalized };
    }
    if (normalized === 'high') break;
  }

  return {
    shouldAlert: Boolean(best),
    primaryLabel: best?.label,
    primaryLevel: best?.level,
  };
}

export function collectPollenReminderTrigger(
  profileId: number,
  evaluation: PollenAlertEvaluation,
  hour: number,
  minute: number,
  now = new Date(),
  quietHours?: { start: number; end: number },
): ScheduledReminderTrigger | null {
  if (!evaluation.shouldAlert) return null;

  const adjusted = quietHours
    ? applyQuietHours(hour, minute, quietHours.start, quietHours.end)
    : { hour, minute };

  const today = startOfLocalDay(now);
  let at = buildLocalDateTime(today, adjusted.hour, adjusted.minute);
  if (at.getTime() <= now.getTime()) {
    at = buildLocalDateTime(addLocalDays(today, 1), adjusted.hour, adjusted.minute);
  }

  return {
    at,
    kind: 'pollen',
    profileId,
    pollenLabel: evaluation.primaryLabel,
    pollenLevel: evaluation.primaryLevel,
  };
}
