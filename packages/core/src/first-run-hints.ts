/**
 * First-run coach-mark gating. Pure domain rules — no React, no storage.
 *
 * Tours show only after registration (`eligible`) and only until the user
 * finishes or skips them. Existing users without the eligible flag never see
 * hints, even if the seen list is empty.
 */

export const HINT_TOUR_IDS = ['home', 'diary', 'scanner', 'map', 'sos'] as const;

export type HintTourId = (typeof HINT_TOUR_IDS)[number];

const HINT_TOUR_ID_SET = new Set<string>(HINT_TOUR_IDS);

export function isHintTourId(value: string): value is HintTourId {
  return HINT_TOUR_ID_SET.has(value);
}

/**
 * Unknown and empty tokens are dropped: an older app version may have written
 * ids that this build no longer knows.
 */
export function parseSeenHintTours(raw: string | null): HintTourId[] {
  if (!raw) return [];

  const seen = new Set<HintTourId>();
  for (const token of raw.split(',')) {
    const id = token.trim();
    if (!isHintTourId(id) || seen.has(id)) continue;
    seen.add(id);
  }

  return HINT_TOUR_IDS.filter((id) => seen.has(id));
}

export function serializeSeenHintTours(ids: readonly HintTourId[]): string {
  const seen = new Set(ids);
  return HINT_TOUR_IDS.filter((id) => seen.has(id)).join(',');
}

export function withSeenHintTour(raw: string | null, tourId: HintTourId): string {
  return serializeSeenHintTours([...parseSeenHintTours(raw), tourId]);
}

export function withAllHintToursSeen(): string {
  return serializeSeenHintTours(HINT_TOUR_IDS);
}

export function shouldShowHintTour(
  tourId: HintTourId,
  state: { eligible: boolean; seenRaw: string | null },
): boolean {
  if (!state.eligible) return false;
  return !parseSeenHintTours(state.seenRaw).includes(tourId);
}

export function areAllHintToursSeen(seenRaw: string | null): boolean {
  const seen = new Set(parseSeenHintTours(seenRaw));
  return HINT_TOUR_IDS.every((id) => seen.has(id));
}
