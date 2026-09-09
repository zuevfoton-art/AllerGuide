import { describe, expect, it } from 'vitest';
import {
  buildWeekRing,
  shouldOfferWeekRingNudge,
  startOfLocalWeek,
  WEEK_RING_SLOTS,
} from './week-ring';

function entry(iso: string) {
  return { type: 'symptom', details: '{}', createdAt: iso };
}

describe('startOfLocalWeek', () => {
  it('returns Monday for any day of the week', () => {
    // 2026-09-09 is a Wednesday; the week starts on Monday 2026-09-07.
    for (const day of ['2026-09-07', '2026-09-09', '2026-09-13']) {
      const monday = startOfLocalWeek(new Date(`${day}T12:00:00`));
      expect(monday.getDay()).toBe(1);
      expect(monday.getDate()).toBe(7);
    }
  });
});

describe('buildWeekRing', () => {
  it('marks the days with diary activity and keeps seven slots', () => {
    const now = new Date('2026-09-09T18:00:00');
    const ring = buildWeekRing(
      [entry('2026-09-07T09:00:00'), entry('2026-09-09T08:30:00')],
      now,
    );

    expect(ring.slots).toHaveLength(WEEK_RING_SLOTS);
    expect(ring.total).toBe(WEEK_RING_SLOTS);
    expect(ring.loggedCount).toBe(2);
    expect(ring.slots.map((slot) => slot.logged)).toEqual([
      true,
      false,
      true,
      false,
      false,
      false,
      false,
    ]);
  });

  it('separates today and the days still to come from misses', () => {
    const ring = buildWeekRing([], new Date('2026-09-09T18:00:00'));

    expect(ring.slots.findIndex((slot) => slot.isToday)).toBe(2);
    expect(ring.slots.filter((slot) => slot.isFuture).map((slot) => slot.index)).toEqual([3, 4, 5, 6]);
  });

  it('counts a 0 — no symptoms check-in as a logged day', () => {
    const now = new Date('2026-09-09T18:00:00');
    const ring = buildWeekRing([entry('2026-09-09T07:00:00')], now);

    expect(ring.loggedCount).toBe(1);
  });

  it('ignores entries from other weeks', () => {
    const ring = buildWeekRing(
      [entry('2026-09-06T12:00:00'), entry('2026-09-14T12:00:00')],
      new Date('2026-09-09T18:00:00'),
    );

    expect(ring.loggedCount).toBe(0);
  });

  it('leaves an empty week empty instead of reporting a broken streak', () => {
    const ring = buildWeekRing([], new Date('2026-09-09T18:00:00'));

    expect(ring.loggedCount).toBe(0);
    expect(ring.slots.every((slot) => !slot.logged)).toBe(true);
  });
});

describe('shouldOfferWeekRingNudge', () => {
  it('waits until four days of the week are logged', () => {
    const now = new Date('2026-09-11T18:00:00');
    const days = ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10'];

    expect(shouldOfferWeekRingNudge(buildWeekRing(days.slice(0, 3).map((d) => entry(`${d}T09:00:00`)), now))).toBe(false);
    expect(shouldOfferWeekRingNudge(buildWeekRing(days.map((d) => entry(`${d}T09:00:00`)), now))).toBe(true);
  });
});
