import {
  areAllHintToursSeen,
  shouldShowHintTour,
  withAllHintToursSeen,
  withSeenHintTour,
  type HintTourId,
} from '@allerguide/core';
import { trackEvent } from '@/src/services/analytics-service';
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

/** Persist that this tour was shown so leaving the tab does not replay it. */
export function rememberHintTour(userId: number, tourId: HintTourId): void {
  if (!isPersistedUserId(userId)) return;
  const nextSeen = withSeenHintTour(getSetting(hintsSeenToursKey(userId)), tourId);
  setSetting(hintsSeenToursKey(userId), nextSeen);
  if (areAllHintToursSeen(nextSeen)) {
    setSetting(hintsEligibleKey(userId), '');
  }
}

export function startHintTour(userId: number, tourId: HintTourId, stepsTotal: number): void {
  if (!isPersistedUserId(userId)) return;
  trackEvent('hint_tour_started', { tour_id: tourId, steps_total: stepsTotal });
}

export function completeHintTour(userId: number, tourId: HintTourId, stepsTotal: number): void {
  if (!isPersistedUserId(userId)) return;
  rememberHintTour(userId, tourId);
  trackEvent('hint_tour_completed', { tour_id: tourId, steps_total: stepsTotal });
}

export function dismissAllHintTours(
  userId: number,
  from: { tourId: HintTourId; stepIndex: number; stepId?: string; stepsTotal: number },
): void {
  if (!isPersistedUserId(userId)) return;
  setSetting(hintsSeenToursKey(userId), withAllHintToursSeen());
  setSetting(hintsEligibleKey(userId), '');
  trackEvent('hint_tour_skipped', {
    tour_id: from.tourId,
    step_index: from.stepIndex,
    steps_total: from.stepsTotal,
    ...(from.stepId ? { step_id: from.stepId } : {}),
  });
}

export function clearHintsState(userId: number): void {
  if (!isPersistedUserId(userId)) return;
  setSetting(hintsEligibleKey(userId), '');
  setSetting(hintsSeenToursKey(userId), '');
}
