import { addLocalDays, hasDiaryEntryOnDate, startOfLocalDay, type DiaryEntryLike } from './reminder-policy';

/**
 * Week ring — the shame-free return loop (north-star §4.8).
 *
 * Seven Monday-to-Sunday slots. A slot is filled by *any* diary activity that
 * day, including a `0 — no symptoms` check-in. A miss stays an empty slot: no
 * streak counter, no «you broke it» copy, nothing to burn down.
 */
export const WEEK_RING_SLOTS = 7;

/** Ghost nudge threshold — a quiet suggestion, never confetti. */
export const WEEK_RING_NUDGE_MIN_DAYS = 4;

export type WeekRingSlot = {
  /** 0 = Monday … 6 = Sunday. */
  index: number;
  /** Local midnight of the slot's day. */
  date: Date;
  logged: boolean;
  isToday: boolean;
  /** Slots after today: rendered as neutral, not as misses. */
  isFuture: boolean;
};

export type WeekRing = {
  slots: WeekRingSlot[];
  loggedCount: number;
  total: number;
};

/** Monday of the local week containing `date`. */
export function startOfLocalWeek(date: Date): Date {
  const day = startOfLocalDay(date);
  const mondayOffset = (day.getDay() + 6) % 7;
  return addLocalDays(day, -mondayOffset);
}

export function buildWeekRing(entries: DiaryEntryLike[], now = new Date()): WeekRing {
  const today = startOfLocalDay(now).getTime();
  const monday = startOfLocalWeek(now);

  const slots: WeekRingSlot[] = [];
  for (let index = 0; index < WEEK_RING_SLOTS; index += 1) {
    const date = addLocalDays(monday, index);
    const time = date.getTime();
    slots.push({
      index,
      date,
      logged: hasDiaryEntryOnDate(entries, date, now),
      isToday: time === today,
      isFuture: time > today,
    });
  }

  return {
    slots,
    loggedCount: slots.filter((slot) => slot.logged).length,
    total: WEEK_RING_SLOTS,
  };
}

/** True once the week is going well enough to offer a gentle extra read. */
export function shouldOfferWeekRingNudge(ring: WeekRing): boolean {
  return ring.loggedCount >= WEEK_RING_NUDGE_MIN_DAYS;
}
