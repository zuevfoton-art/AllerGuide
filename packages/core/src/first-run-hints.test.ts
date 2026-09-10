import { describe, expect, it } from 'vitest';
import {
  HINT_TOUR_IDS,
  areAllHintToursSeen,
  isHintTourId,
  parseSeenHintTours,
  serializeSeenHintTours,
  shouldShowHintTour,
  withAllHintToursSeen,
  withSeenHintTour,
} from './first-run-hints';

describe('isHintTourId', () => {
  it('accepts known tour ids and rejects everything else', () => {
    expect(isHintTourId('home')).toBe(true);
    expect(isHintTourId('market')).toBe(false);
    expect(isHintTourId('')).toBe(false);
  });
});

describe('parseSeenHintTours', () => {
  it('returns an empty list for missing or blank storage', () => {
    expect(parseSeenHintTours(null)).toEqual([]);
    expect(parseSeenHintTours('')).toEqual([]);
    expect(parseSeenHintTours('   ')).toEqual([]);
  });

  it('drops empty tokens, unknown ids, and duplicates', () => {
    expect(parseSeenHintTours('home,,bogus,diary,home')).toEqual(['home', 'diary']);
  });

  it('returns tours in the canonical HINT_TOUR_IDS order', () => {
    expect(parseSeenHintTours('sos,home,map')).toEqual(['home', 'map', 'sos']);
  });
});

describe('serializeSeenHintTours', () => {
  it('dedupes and reorders to the canonical list', () => {
    expect(serializeSeenHintTours(['sos', 'home', 'home'])).toBe('home,sos');
  });
});

describe('withSeenHintTour', () => {
  it('is idempotent when the tour is already recorded', () => {
    const once = withSeenHintTour(null, 'home');
    expect(once).toBe('home');
    expect(withSeenHintTour(once, 'home')).toBe('home');
  });

  it('appends a new tour without losing earlier ones', () => {
    expect(withSeenHintTour('home', 'diary')).toBe('home,diary');
  });
});

describe('shouldShowHintTour', () => {
  it('shows a tour only when the user is eligible and has not seen it', () => {
    expect(shouldShowHintTour('home', { eligible: true, seenRaw: null })).toBe(true);
    expect(shouldShowHintTour('diary', { eligible: true, seenRaw: 'home' })).toBe(true);
  });

  it('hides every tour when the user is not eligible, even with an empty seen list', () => {
    expect(shouldShowHintTour('home', { eligible: false, seenRaw: null })).toBe(false);
    expect(shouldShowHintTour('home', { eligible: false, seenRaw: '' })).toBe(false);
  });

  it('hides a tour that is already in the seen list', () => {
    expect(shouldShowHintTour('home', { eligible: true, seenRaw: 'home' })).toBe(false);
  });
});

describe('areAllHintToursSeen', () => {
  it('is true only when every known tour id is present', () => {
    expect(areAllHintToursSeen(null)).toBe(false);
    expect(areAllHintToursSeen('home,diary,scanner,map')).toBe(false);
    expect(areAllHintToursSeen(withAllHintToursSeen())).toBe(true);
  });

  it('covers every HINT_TOUR_IDS entry when skipping all tours', () => {
    const seen = parseSeenHintTours(withAllHintToursSeen());
    expect(seen).toEqual([...HINT_TOUR_IDS]);
  });
});
