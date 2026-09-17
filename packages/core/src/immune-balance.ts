import { addLocalDays, startOfLocalDay } from './reminder-policy';
import { startOfLocalWeek, WEEK_RING_SLOTS } from './week-ring';
import type { WellnessScoreBreakdown } from './wellness';
import { WELLNESS_WEIGHTS } from './wellness-weights';

/** How many full weeks before the current week the day picker can reach. */
export const IMMUNE_BALANCE_LOOKBACK_WEEKS = 1;

/** Penalty caps so a full ring means that axis added no drag to the index. */
export const IMMUNE_BALANCE_RING_CAPS = {
  pollen: WELLNESS_WEIGHTS.pollen.high + WELLNESS_WEIGHTS.crossReaction.high,
  air: 20,
  diary: WELLNESS_WEIGHTS.diarySymptomDay * 7,
  clinical:
    WELLNESS_WEIGHTS.clinicalScale.uncontrolled + WELLNESS_WEIGHTS.multimorbidAriaAsthma,
} as const;

export type ImmuneBalanceRingId = 'pollen' | 'air' | 'diary' | 'clinical';

export type ImmuneBalanceRings = {
  pollen: number;
  air: number;
  diary: number;
  clinical: number | null;
};

export function clampRingFill(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** 0 penalty → 100; penalty at/over cap → 0. */
export function ringFillFromPenalty(penalty: number, cap: number): number {
  if (!(cap > 0)) return 100;
  const safePenalty = Number.isFinite(penalty) && penalty > 0 ? penalty : 0;
  return clampRingFill(100 - (safePenalty / cap) * 100);
}

export function buildImmuneBalanceRings(
  breakdown: WellnessScoreBreakdown,
  showClinical: boolean,
): ImmuneBalanceRings {
  return {
    pollen: ringFillFromPenalty(
      breakdown.pollenPenalty + breakdown.crossReactionPenalty,
      IMMUNE_BALANCE_RING_CAPS.pollen,
    ),
    air: ringFillFromPenalty(breakdown.aqiPenalty, IMMUNE_BALANCE_RING_CAPS.air),
    diary: ringFillFromPenalty(breakdown.diaryPenalty, IMMUNE_BALANCE_RING_CAPS.diary),
    clinical: showClinical
      ? ringFillFromPenalty(
          breakdown.clinicalPenalty + breakdown.multimorbidPenalty,
          IMMUNE_BALANCE_RING_CAPS.clinical,
        )
      : null,
  };
}

export function isoLocalDate(date: Date): string {
  const day = startOfLocalDay(date);
  const month = String(day.getMonth() + 1).padStart(2, '0');
  const datePart = String(day.getDate()).padStart(2, '0');
  return `${day.getFullYear()}-${month}-${datePart}`;
}

export function endOfLocalDay(date: Date): Date {
  const start = startOfLocalDay(date);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999);
}

export function isSameLocalDay(left: Date, right: Date): boolean {
  return startOfLocalDay(left).getTime() === startOfLocalDay(right).getTime();
}

/** Current week (Mon–today) plus the previous calendar week. Future days omitted. */
export function listSelectableImmuneBalanceDays(now = new Date()): Date[] {
  const today = startOfLocalDay(now);
  const currentMonday = startOfLocalWeek(today);
  const windowStart = addLocalDays(currentMonday, -WEEK_RING_SLOTS * IMMUNE_BALANCE_LOOKBACK_WEEKS);
  const days: Date[] = [];
  for (let cursor = windowStart; cursor.getTime() <= today.getTime(); cursor = addLocalDays(cursor, 1)) {
    days.push(startOfLocalDay(cursor));
  }
  return days;
}

export function shiftImmuneBalanceDay(current: Date, delta: number, now = new Date()): Date {
  const days = listSelectableImmuneBalanceDays(now);
  if (days.length === 0) return startOfLocalDay(now);
  const currentTime = startOfLocalDay(current).getTime();
  const index = days.findIndex((day) => day.getTime() === currentTime);
  const from = index < 0 ? days.length - 1 : index;
  const next = days[from + delta];
  return next ?? days[from]!;
}

export function canShiftImmuneBalanceDay(current: Date, delta: number, now = new Date()): boolean {
  const shifted = shiftImmuneBalanceDay(current, delta, now);
  return startOfLocalDay(shifted).getTime() !== startOfLocalDay(current).getTime();
}

export function diaryEntriesOnOrBefore<T extends { createdAt: string }>(
  entries: T[],
  asOf: Date,
): T[] {
  const cutoff = endOfLocalDay(asOf).getTime();
  return entries.filter((entry) => {
    const at = Date.parse(entry.createdAt);
    return Number.isFinite(at) && at <= cutoff;
  });
}
