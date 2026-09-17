import { describe, expect, it } from 'vitest';
import {
  buildImmuneBalanceRings,
  canShiftImmuneBalanceDay,
  diaryEntriesOnOrBefore,
  IMMUNE_BALANCE_RING_CAPS,
  isoLocalDate,
  listSelectableImmuneBalanceDays,
  ringFillFromPenalty,
  shiftImmuneBalanceDay,
} from './immune-balance';
import { startOfLocalDay } from './reminder-policy';
import { WELLNESS_WEIGHTS_VERSION } from './wellness-weights';

const emptyBreakdown = {
  score: 100,
  pollenPenalty: 0,
  aqiPenalty: 0,
  diaryPenalty: 0,
  clinicalPenalty: 0,
  asitPenalty: 0,
  crossReactionPenalty: 0,
  multimorbidPenalty: 0,
  crossReactionMatches: [],
  weightsVersion: WELLNESS_WEIGHTS_VERSION,
};

describe('immune-balance rings', () => {
  it('maps zero penalty to a full ring and a cap hit to empty', () => {
    expect(ringFillFromPenalty(0, 40)).toBe(100);
    expect(ringFillFromPenalty(40, 40)).toBe(0);
    expect(ringFillFromPenalty(80, 40)).toBe(0);
    expect(ringFillFromPenalty(10, 40)).toBe(75);
  });

  it('treats invalid caps and penalties as a full ring', () => {
    expect(ringFillFromPenalty(12, 0)).toBe(100);
    expect(ringFillFromPenalty(Number.NaN, 40)).toBe(100);
  });

  it('hides the clinical ring when the profile has no scales', () => {
    const rings = buildImmuneBalanceRings(
      { ...emptyBreakdown, pollenPenalty: IMMUNE_BALANCE_RING_CAPS.pollen },
      false,
    );
    expect(rings.pollen).toBe(0);
    expect(rings.clinical).toBeNull();
  });

  it('fills the clinical ring from ACT/ARIA penalties', () => {
    const rings = buildImmuneBalanceRings(
      { ...emptyBreakdown, clinicalPenalty: 16, multimorbidPenalty: 10 },
      true,
    );
    expect(rings.clinical).toBe(
      ringFillFromPenalty(26, IMMUNE_BALANCE_RING_CAPS.clinical),
    );
  });
});

describe('immune-balance day window', () => {
  it('starts on the previous Monday and stops at today', () => {
    const wednesday = new Date(2026, 8, 16, 15, 0, 0);
    const days = listSelectableImmuneBalanceDays(wednesday);
    expect(isoLocalDate(days[0]!)).toBe('2026-09-07');
    expect(isoLocalDate(days[days.length - 1]!)).toBe('2026-09-16');
    expect(days).toHaveLength(10);
  });

  it('does not walk into a future day', () => {
    const today = new Date(2026, 8, 16);
    expect(canShiftImmuneBalanceDay(today, 1, today)).toBe(false);
    const yesterday = shiftImmuneBalanceDay(today, -1, today);
    expect(isoLocalDate(yesterday)).toBe('2026-09-15');
    expect(canShiftImmuneBalanceDay(today, -1, today)).toBe(true);
  });

  it('drops diary entries after the selected day', () => {
    const asOf = startOfLocalDay(new Date(2026, 8, 10));
    const kept = diaryEntriesOnOrBefore(
      [
        { createdAt: '2026-09-10T08:00:00' },
        { createdAt: '2026-09-11T08:00:00' },
      ],
      asOf,
    );
    expect(kept).toHaveLength(1);
    expect(kept[0]?.createdAt).toBe('2026-09-10T08:00:00');
  });
});
