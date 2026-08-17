import { describe, expect, it } from 'vitest';
import {
  buildForecastDaysFromGoogle,
  buildReadingsFromGoogleForecastDay,
  buildUpiByTaxonFromGoogleDay,
  googleTypeKeyForTaxon,
  isTreeSpeciesPollenTaxon,
  mergeGoogleAndOpenMeteoMapReadings,
  resolveGoogleUpiForTaxon,
} from './pollen-google-forecast';
import type { PollenMapReading } from './pollen-map';

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

  it('identifies tree species taxa', () => {
    expect(isTreeSpeciesPollenTaxon('birch_pollen')).toBe(true);
    expect(isTreeSpeciesPollenTaxon('alder_pollen')).toBe(true);
    expect(isTreeSpeciesPollenTaxon('olive_pollen')).toBe(true);
    expect(isTreeSpeciesPollenTaxon('oak_pollen')).toBe(true);
    expect(isTreeSpeciesPollenTaxon('juniper_pollen')).toBe(true);
    expect(isTreeSpeciesPollenTaxon('grass_pollen')).toBe(false);
    expect(isTreeSpeciesPollenTaxon('ragweed_pollen')).toBe(false);
  });

  it('prefers plant UPI and does not use TREE for any tree species', () => {
    expect(resolveGoogleUpiForTaxon('birch_pollen', day)?.index).toBe(4);
    expect(resolveGoogleUpiForTaxon('alder_pollen', day)).toBeNull();
    expect(resolveGoogleUpiForTaxon('olive_pollen', day)).toBeNull();
    expect(resolveGoogleUpiForTaxon('oak_pollen', day)).toBeNull();
    expect(resolveGoogleUpiForTaxon('japanese_cedar_pollen', day)).toBeNull();
    expect(resolveGoogleUpiForTaxon('grass_pollen', day)?.index).toBe(2);
  });

  it('uses Google plant UPI for Google-only species like oak', () => {
    const oakDay = {
      date: '2026-08-04',
      plantIndexes: {
        oak_pollen: { index: 3 as const, source: 'google' as const, category: 'Moderate' },
      },
    };
    expect(resolveGoogleUpiForTaxon('oak_pollen', oakDay)?.index).toBe(3);
    const readings = buildReadingsFromGoogleForecastDay(oakDay, []);
    expect(readings.find((item) => item.taxonId === 'oak_pollen')).toMatchObject({
      value: 3,
      level: 'mid',
    });
  });

  it('builds readings with UPI value and tier level', () => {
    const readings = buildReadingsFromGoogleForecastDay(day, ['birch-pollen']);
    const birch = readings.find((item) => item.taxonId === 'birch_pollen');
    expect(birch).toMatchObject({
      value: 4,
      level: 'high',
      profileRelevant: true,
    });
    expect(readings.find((item) => item.taxonId === 'alder_pollen')).toBeUndefined();
  });

  it('builds multi-day forecast and upi map', () => {
    const days = buildForecastDaysFromGoogle([day, { ...day, date: '2026-08-05' }], []);
    expect(days).toHaveLength(2);
    expect(buildUpiByTaxonFromGoogleDay(day).birch_pollen?.source).toBe('google');
    expect(buildUpiByTaxonFromGoogleDay(day).alder_pollen).toBeUndefined();
  });

  it('merges Open-Meteo species readings when Google plant UPI is missing', () => {
    const openMeteoReadings: PollenMapReading[] = [
      {
        taxonId: 'alder_pollen',
        allergenId: 'alder-pollen',
        value: 40,
        level: 'mid',
        profileRelevant: false,
      },
      {
        taxonId: 'olive_pollen',
        allergenId: 'olive-pollen',
        value: 5,
        level: 'low',
        profileRelevant: false,
      },
    ];

    const merged = mergeGoogleAndOpenMeteoMapReadings(day, openMeteoReadings, ['birch-pollen']);
    expect(merged.upiByTaxon.birch_pollen).toMatchObject({ index: 4, source: 'google' });
    expect(merged.upiByTaxon.alder_pollen?.source).toBe('open-meteo');
    expect(merged.upiByTaxon.olive_pollen?.source).toBe('open-meteo');
    expect(merged.readings.find((item) => item.taxonId === 'alder_pollen')?.value).toBe(40);
    expect(merged.readings.find((item) => item.taxonId === 'birch_pollen')?.profileRelevant).toBe(
      true,
    );
  });

  it('keeps birch, alder and olive at distinct plant UPI and never copies TREE', () => {
    const speciesDay = {
      date: '2026-04-15',
      typeIndexes: {
        TREE: { index: 5 as const, source: 'google' as const, category: 'Very High' },
      },
      plantIndexes: {
        birch_pollen: { index: 4 as const, source: 'google' as const, category: 'High' },
        alder_pollen: { index: 2 as const, source: 'google' as const, category: 'Low' },
        olive_pollen: { index: 1 as const, source: 'google' as const, category: 'Very Low' },
      },
    };

    const merged = mergeGoogleAndOpenMeteoMapReadings(speciesDay, [], ['alder-pollen']);
    expect(merged.upiByTaxon.birch_pollen).toMatchObject({ index: 4, source: 'google' });
    expect(merged.upiByTaxon.alder_pollen).toMatchObject({ index: 2, source: 'google' });
    expect(merged.upiByTaxon.olive_pollen).toMatchObject({ index: 1, source: 'google' });
    expect(merged.readings.find((item) => item.taxonId === 'birch_pollen')?.value).toBe(4);
    expect(merged.readings.find((item) => item.taxonId === 'alder_pollen')).toMatchObject({
      value: 2,
      profileRelevant: true,
    });
    expect(merged.readings.find((item) => item.taxonId === 'olive_pollen')?.value).toBe(1);
  });

  it('synthesizes a chip reading from Google plant UPI when Open-Meteo has no grains', () => {
    const oliveOnlyDay = {
      date: '2026-05-20',
      typeIndexes: {
        TREE: { index: 3 as const, source: 'google' as const },
      },
      plantIndexes: {
        olive_pollen: { index: 2 as const, source: 'google' as const, category: 'Low' },
      },
    };

    const merged = mergeGoogleAndOpenMeteoMapReadings(oliveOnlyDay, [], ['olive-pollen']);
    expect(merged.upiByTaxon.olive_pollen).toMatchObject({ index: 2, source: 'google' });
    expect(merged.readings.find((item) => item.taxonId === 'olive_pollen')).toMatchObject({
      taxonId: 'olive_pollen',
      allergenId: 'olive-pollen',
      value: 2,
      level: 'low',
      profileRelevant: true,
    });
    expect(merged.upiByTaxon.birch_pollen).toBeUndefined();
    expect(merged.upiByTaxon.alder_pollen).toBeUndefined();
  });
});
