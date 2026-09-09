import { describe, expect, it } from 'vitest';
import {
  buildTodayReading,
  formatTodayDate,
  hasCheckedInToday,
} from '@/src/services/today-reading-service';
import type { WellnessSnapshot } from '@/src/services/wellness-service';
import type { DiaryEntry, Profile } from '@allerguide/core';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}(${Object.values(params).join(',')})` : key;

const profile = { id: 1, name: 'Аня', type: 'self', allergies: [] } as unknown as Profile;

function snapshot(display: Partial<WellnessSnapshot['display']>, envDataAvailable = true) {
  return {
    envDataAvailable,
    display: {
      indexTier: 'low',
      pollenTier: 'none',
      airTier: 'low',
      diaryTier: 'none',
      primaryFactorId: 'none',
      pollenValue: null,
      pollenAllergenLabel: null,
      pm25: null,
      symptomDays: 0,
      ...display,
    },
  } as unknown as WellnessSnapshot;
}

describe('buildTodayReading', () => {
  it('asks for a profile and points at profile setup', () => {
    const reading = buildTodayReading({ profile: null, wellness: null, t });
    expect(reading.lead).toBe('today.lead.noProfile');
    expect(reading.advice).toBe('today.advice.noProfile');
    expect(reading.action.href).toBe('/profile-setup?mode=add');
    expect(reading.tone).toBe('calm');
  });

  it('appends the named allergen to the lead sentence', () => {
    const reading = buildTodayReading({
      profile,
      wellness: snapshot({ pollenTier: 'high', pollenAllergenLabel: 'Берёза' }),
      t,
    });
    expect(reading.lead).toBe('today.lead.pollenHigh today.leadAllergen(Берёза)');
    expect(reading.tone).toBe('careful');
    expect(reading.action.href).toBe('/(tabs)/map');
  });

  it('keeps the lead unchanged when no plant is known', () => {
    const reading = buildTodayReading({
      profile,
      wellness: snapshot({ pollenTier: 'moderate' }),
      t,
    });
    expect(reading.lead).toBe('today.lead.pollenModerate');
    expect(reading.tone).toBe('watch');
  });

  it('offers a local next step when there is no environment data', () => {
    const reading = buildTodayReading({ profile, wellness: snapshot({}, false), t });
    expect(reading.lead).toBe('today.lead.noData');
    expect(reading.action.href).toBe('/(tabs)/diary');
  });

  it('treats a missing snapshot as unknown, not alarming', () => {
    const reading = buildTodayReading({ profile, wellness: null, t });
    expect(reading.tone).toBe('calm');
    expect(reading.lead).toBe('today.lead.noData');
  });
});

describe('hasCheckedInToday', () => {
  const now = new Date('2026-09-09T12:00:00');

  it('is true for an entry created the same calendar day', () => {
    const entries = [{ createdAt: '2026-09-09T08:30:00' }] as unknown as DiaryEntry[];
    expect(hasCheckedInToday(entries, now)).toBe(true);
  });

  it('is false for yesterday', () => {
    const entries = [{ createdAt: '2026-09-08T23:30:00' }] as unknown as DiaryEntry[];
    expect(hasCheckedInToday(entries, now)).toBe(false);
  });
});

describe('formatTodayDate', () => {
  it('renders a weekday and month for the locale', () => {
    const label = formatTodayDate('ru', new Date('2026-09-09T12:00:00'));
    expect(label).toContain('сентября');
  });

  it('falls back instead of throwing on a bad locale tag', () => {
    expect(formatTodayDate('not a locale', new Date('2026-09-09T12:00:00'))).toBeTruthy();
  });
});
