import { describe, expect, it } from 'vitest';
import { GOOGLE_POLLEN_PLANT_CODES } from './pollen-plant-detail';
import {
  normalizeGooglePollenForecast,
  summarizeGooglePlantCoverage,
} from './pollen-google-normalize';
import { resolveGoogleUpiForTaxon } from './pollen-google-forecast';
import { POLLEN_MAP_TAXON_IDS } from './pollen-map';

describe('normalizeGooglePollenForecast', () => {
  const fixture = {
    regionCode: 'RU',
    dailyInfo: [
      {
        date: { year: 2026, month: 4, day: 15 },
        pollenTypeInfo: [
          {
            code: 'TREE',
            indexInfo: { value: 4, category: 'High', color: { red: 1, green: 0.3, blue: 0.2 } },
            healthRecommendations: ['Limit outdoor time.'],
          },
          { code: 'GRASS', indexInfo: { value: 2, category: 'Low' } },
          { code: 'WEED', indexInfo: { value: 1, category: 'Very Low' } },
        ],
        plantInfo: GOOGLE_POLLEN_PLANT_CODES.map((code, index) => ({
          code,
          displayName: code,
          inSeason: index % 2 === 0,
          indexInfo:
            code === 'ASH' || code === 'GRAMINALES' || code === 'RAGWEED'
              ? undefined
              : {
                  value: (index % 5) + 1,
                  category: 'Moderate',
                  indexDescription: `${code} is in the air.`,
                  color: { red: 0.2, green: 0.8, blue: 0.3 },
                },
          plantDescription: {
            family: 'Testaceae',
            season: 'Spring',
            specialColors: 'yellow',
            specialShapes: 'round',
            picture: 'https://example.com/plant.png',
            crossReaction: 'Apple',
          },
        })),
      },
    ],
  };

  it('normalizes all 17 Google plant codes onto map taxa', () => {
    const result = normalizeGooglePollenForecast(fixture);
    expect(GOOGLE_POLLEN_PLANT_CODES).toHaveLength(17);
    expect(result.days[0]?.plantCoverage).toHaveLength(17);
    expect(Object.keys(result.plants).length).toBe(17);
    for (const taxonId of POLLEN_MAP_TAXON_IDS) {
      expect(result.plants[taxonId], taxonId).toBeTruthy();
    }
  });

  it('keeps inSeason, index description, color and type health recommendations', () => {
    const birch = normalizeGooglePollenForecast(fixture).plants.birch_pollen;
    expect(birch?.inSeason).toBe(true);
    expect(birch?.indexDescription).toBe('BIRCH is in the air.');
    expect(birch?.indexColor).toMatch(/^#[0-9A-F]{6}$/);
    expect(birch?.healthRecommendations).toEqual(['Limit outdoor time.']);
    expect(birch?.family).toBe('Testaceae');
  });

  it('does not fall back to TREE for a tree species without plant UPI', () => {
    const day = normalizeGooglePollenForecast(fixture).days[0]!;
    expect(day.plantIndexes.ash_pollen).toBeUndefined();
    expect(resolveGoogleUpiForTaxon('ash_pollen', day)).toBeNull();
    expect(resolveGoogleUpiForTaxon('birch_pollen', day)?.index).toBeGreaterThan(0);
  });

  it('records BIRCH / ALDER / OLIVE coverage with and without indexInfo', () => {
    const result = normalizeGooglePollenForecast({
      regionCode: 'RU',
      dailyInfo: [
        {
          date: { year: 2026, month: 4, day: 15 },
          pollenTypeInfo: [
            { code: 'TREE', indexInfo: { value: 4, category: 'High' } },
          ],
          plantInfo: [
            { code: 'BIRCH', indexInfo: { value: 3, category: 'Moderate' } },
            { code: 'ALDER' },
            { code: 'OLIVE', displayName: 'Olive' },
          ],
        },
      ],
    });
    const day = result.days[0]!;
    expect(day.plantIndexes.birch_pollen?.index).toBe(3);
    expect(day.plantIndexes.alder_pollen).toBeUndefined();
    expect(day.plantIndexes.olive_pollen).toBeUndefined();
    expect(day.plants.alder_pollen?.displayName).toBeTruthy();
    expect(day.plants.olive_pollen?.displayName).toBe('Olive');

    const summary = summarizeGooglePlantCoverage(day.plantCoverage);
    expect(summary.withIndex).toEqual(['BIRCH']);
    expect(summary.withoutIndex).toEqual(['ALDER', 'OLIVE']);
    expect(summary.treeSpecies).toEqual([
      { code: 'BIRCH', present: true, hasIndex: true },
      { code: 'ALDER', present: true, hasIndex: false },
      { code: 'OLIVE', present: true, hasIndex: false },
    ]);
  });

  it('allows grass and weed type fallback when the plant index is missing', () => {
    const day = normalizeGooglePollenForecast(fixture).days[0]!;
    expect(day.plantIndexes.grass_pollen).toBeUndefined();
    expect(resolveGoogleUpiForTaxon('grass_pollen', day)?.index).toBe(2);
    expect(day.plantIndexes.ragweed_pollen).toBeUndefined();
    expect(resolveGoogleUpiForTaxon('ragweed_pollen', day)?.index).toBe(1);
  });
});
