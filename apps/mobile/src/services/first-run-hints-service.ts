import {
  areAllHintToursSeen,
  shouldShowHintTour,
  withAllHintToursSeen,
  withSeenHintTour,
  type HintTourId,
} from '@allerguide/core';
import { getSetting, setSetting } from '@/src/services/settings-service';

const ELIGIBLE_PREFIX = 'hintsEligible:';
const SEEN_PREFIX = 'hintsSeenTours:';

function isPersistedUserId(userId: number): boolean {
  return Number.isInteger(userId) && userId > 0;
}

export function hintsEligibleKey(userId: number): string {
  return `${ELIGIBLE_PREFIX}${userId}`;
}

export function hintsSeenToursKey(userId: number): string {
  return `${SEEN_PREFIX}${userId}`;
}

export function markHintsEligible(userId: number): void {
  if (!isPersistedUserId(userId)) return;
  setSetting(hintsEligibleKey(userId), 'true');
}

export function isHintTourPending(userId: number, tourId: HintTourId): boolean {
  if (!isPersistedUserId(userId)) return false;
  return shouldShowHintTour(tourId, {
    eligible: getSetting(hintsEligibleKey(userId)) === 'true',
    seenRaw: getSetting(hintsSeenToursKey(userId)),
  });
}

/** Reserved for analytics (P5). Keeps the start call site stable. */
export function startHintTour(
  _userId: number,
  _tourId: HintTourId,
  _stepsTotal: number,
): void {}

export function completeHintTour(userId: number, tourId: HintTourId, _stepsTotal: number): void {
  if (!isPersistedUserId(userId)) return;

  const nextSeen = withSeenHintTour(getSetting(hintsSeenToursKey(userId)), tourId);
  setSetting(hintsSeenToursKey(userId), nextSeen);

  if (areAllHintToursSeen(nextSeen)) {
    setSetting(hintsEligibleKey(userId), '');
  }
}

export function dismissAllHintTours(
  userId: number,
  _from: { tourId: HintTourId; stepIndex: number },
): void {
  if (!isPersistedUserId(userId)) return;
  setSetting(hintsSeenToursKey(userId), withAllHintToursSeen());
  setSetting(hintsEligibleKey(userId), '');
}

export function clearHintsState(userId: number): void {
  if (!isPersistedUserId(userId)) return;
  setSetting(hintsEligibleKey(userId), '');
  setSetting(hintsSeenToursKey(userId), '');
}
