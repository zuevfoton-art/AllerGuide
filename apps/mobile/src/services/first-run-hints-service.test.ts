import { beforeEach, describe, expect, it, vi } from 'vitest';

const settings = new Map<string, string>();

vi.mock('@/src/services/settings-service', () => ({
  getSetting: (key: string) => settings.get(key) ?? null,
  setSetting: (key: string, value: string) => {
    if (value) settings.set(key, value);
    else settings.delete(key);
  },
}));

import {
  clearHintsState,
  completeHintTour,
  dismissAllHintTours,
  hintsEligibleKey,
  hintsSeenToursKey,
  isHintTourPending,
  markHintsEligible,
} from './first-run-hints-service';

describe('first-run-hints-service', () => {
  beforeEach(() => {
    settings.clear();
  });

  it('marks only the given user eligible', () => {
    markHintsEligible(7);
    expect(settings.get(hintsEligibleKey(7))).toBe('true');
    expect(isHintTourPending(7, 'home')).toBe(true);
    expect(isHintTourPending(8, 'home')).toBe(false);
  });

  it('ignores invalid user ids', () => {
    markHintsEligible(0);
    markHintsEligible(-3);
    markHintsEligible(1.5);
    expect(settings.size).toBe(0);
    expect(isHintTourPending(0, 'home')).toBe(false);
  });

  it('hides a completed tour and keeps the next one pending', () => {
    markHintsEligible(3);
    completeHintTour(3, 'home', 5);
    expect(isHintTourPending(3, 'home')).toBe(false);
    expect(isHintTourPending(3, 'diary')).toBe(true);
  });

  it('clears eligibility after the last tour is completed', () => {
    markHintsEligible(3);
    completeHintTour(3, 'home', 5);
    completeHintTour(3, 'diary', 3);
    completeHintTour(3, 'scanner', 3);
    completeHintTour(3, 'map', 2);
    completeHintTour(3, 'sos', 3);
    expect(settings.has(hintsEligibleKey(3))).toBe(false);
    expect(isHintTourPending(3, 'home')).toBe(false);
  });

  it('dismisses every tour at once', () => {
    markHintsEligible(4);
    dismissAllHintTours(4, { tourId: 'home', stepIndex: 0, stepsTotal: 5, stepId: 'profile' });
    expect(isHintTourPending(4, 'home')).toBe(false);
    expect(isHintTourPending(4, 'diary')).toBe(false);
    expect(isHintTourPending(4, 'scanner')).toBe(false);
    expect(isHintTourPending(4, 'map')).toBe(false);
    expect(isHintTourPending(4, 'sos')).toBe(false);
    expect(settings.has(hintsEligibleKey(4))).toBe(false);
  });

  it('clears both persisted keys', () => {
    markHintsEligible(9);
    completeHintTour(9, 'home', 5);
    clearHintsState(9);
    expect(settings.has(hintsEligibleKey(9))).toBe(false);
    expect(settings.has(hintsSeenToursKey(9))).toBe(false);
    expect(isHintTourPending(9, 'diary')).toBe(false);
  });
});
