import { describe, expect, it } from 'vitest';
import {
  buildForecastDaysFromGoogle,
  buildReadingsFromGoogleForecastDay,
  buildUpiByTaxonFromGoogleDay,
  googleTypeKeyForTaxon,
  resolveGoogleUpiForTaxon,
} from './pollen-google-forecast';

describe('pollen-google-forecast', () => {
  const day = {
    date: '2026-08-04',
    typeIndexes: {
      TREE: { index: 3 as const, source: 'google' as const, category: 'Moderate' },
      GRASS: { index: 2 as const, source: 'google' as const },
    },
    plantIndexes: {
      birch_pollen: { index: 4 as const, source: 'google' as const, category: 'High' },
    },
  };

  it('maps taxa to Google type groups', () => {
    expect(googleTypeKeyForTaxon('birch_pollen')).toBe('TREE');
    expect(googleTypeKeyForTaxon('grass_pollen')).toBe('GRASS');
    expect(googleTypeKeyForTaxon('ragweed_pollen')).toBe('WEED');
  });

  it('prefers plant UPI over type UPI', () => {
    expect(resolveGoogleUpiForTaxon('birch_pollen', day)?.index).toBe(4);
    expect(resolveGoogleUpiForTaxon('alder_pollen', day)?.index).toBe(3);
    expect(resolveGoogleUpiForTaxon('grass_pollen', day)?.index).toBe(2);
  });

  it('builds readings with UPI value and tier level', () => {
    const readings = buildReadingsFromGoogleForecastDay(day, ['birch-pollen']);
    const birch = readings.find((item) => item.taxonId === 'birch_pollen');
    expect(birch).toMatchObject({
      value: 4,
      level: 'high',
      profileRelevant: true,
    });
  });

  it('builds multi-day forecast and upi map', () => {
    const days = buildForecastDaysFromGoogle([day, { ...day, date: '2026-08-05' }], []);
    expect(days).toHaveLength(2);
    expect(buildUpiByTaxonFromGoogleDay(day).birch_pollen?.source).toBe('google');
  });
});
