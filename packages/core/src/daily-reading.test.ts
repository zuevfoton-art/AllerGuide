import { describe, expect, it } from 'vitest';
import { buildDailyReading, type DailyReadingInput } from './daily-reading';

function input(overrides: Partial<DailyReadingInput> = {}): DailyReadingInput {
  return {
    hasProfile: true,
    envDataAvailable: true,
    pollenTier: 'none',
    airTier: 'low',
    diaryTier: 'none',
    ...overrides,
  };
}

describe('buildDailyReading', () => {
  it('asks for a profile before anything else', () => {
    const reading = buildDailyReading(input({ hasProfile: false, pollenTier: 'high' }));
    expect(reading.driver).toBe('no-profile');
    expect(reading.leadId).toBe('noProfile');
    expect(reading.action).toBe('create-profile');
  });

  it('degrades to an offline reading without environment data', () => {
    const reading = buildDailyReading(input({ envDataAvailable: false }));
    expect(reading.driver).toBe('no-data');
    expect(reading.tone).toBe('calm');
    expect(reading.action).toBe('open-journal');
  });

  it('leads with high pollen and names the plant', () => {
    const reading = buildDailyReading(
      input({ pollenTier: 'high', airTier: 'high', pollenAllergenLabel: 'Берёза' }),
    );
    expect(reading.driver).toBe('pollen');
    expect(reading.tone).toBe('careful');
    expect(reading.allergenLabel).toBe('Берёза');
    expect(reading.action).toBe('open-map');
  });

  it('falls back to air when pollen is fine', () => {
    const reading = buildDailyReading(input({ airTier: 'high' }));
    expect(reading.driver).toBe('air');
    expect(reading.leadId).toBe('airHigh');
    expect(reading.tone).toBe('careful');
  });

  it('prefers a high tier over a moderate one', () => {
    const reading = buildDailyReading(input({ pollenTier: 'moderate', airTier: 'high' }));
    expect(reading.driver).toBe('air');
    expect(reading.leadId).toBe('airHigh');
  });

  it('watches moderate pollen', () => {
    const reading = buildDailyReading(input({ pollenTier: 'moderate', pollenAllergenLabel: '  ' }));
    expect(reading.tone).toBe('watch');
    expect(reading.leadId).toBe('pollenModerate');
    expect(reading.allergenLabel).toBeNull();
  });

  it('reads symptom days when the environment is calm', () => {
    const reading = buildDailyReading(input({ diaryTier: 'high' }));
    expect(reading.driver).toBe('diary');
    expect(reading.tone).toBe('watch');
    expect(reading.action).toBe('open-journal');
  });

  it('offers the scanner on a calm day', () => {
    const reading = buildDailyReading(input());
    expect(reading.driver).toBe('calm');
    expect(reading.tone).toBe('calm');
    expect(reading.adviceId).toBe('calm');
    expect(reading.action).toBe('open-scanner');
  });

  it('treats unknown tiers as calm rather than alarming', () => {
    const reading = buildDailyReading(
      input({ pollenTier: 'unknown', airTier: 'unknown', diaryTier: 'unknown' }),
    );
    expect(reading.tone).toBe('calm');
    expect(reading.driver).toBe('calm');
  });
});
