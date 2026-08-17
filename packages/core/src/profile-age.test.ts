import { describe, expect, it } from 'vitest';
import { getProfileAgeYears, isChildAgeYears } from './profile-age';

describe('getProfileAgeYears', () => {
  const now = new Date('2026-08-17T00:00:00.000Z');

  it('returns calendar-year age for a plausible birth year', () => {
    expect(getProfileAgeYears(1990, now)).toBe(36);
    expect(getProfileAgeYears(2020, now)).toBe(6);
  });

  it('returns null for missing or implausible years', () => {
    expect(getProfileAgeYears(undefined, now)).toBeNull();
    expect(getProfileAgeYears(null, now)).toBeNull();
    expect(getProfileAgeYears(NaN, now)).toBeNull();
    expect(getProfileAgeYears(1800, now)).toBeNull();
    expect(getProfileAgeYears(2030, now)).toBeNull();
  });

  it('treats ages under 18 as child', () => {
    expect(isChildAgeYears(6)).toBe(true);
    expect(isChildAgeYears(18)).toBe(false);
    expect(isChildAgeYears(null)).toBe(false);
  });
});
