import { describe, expect, it } from 'vitest';
import {
  OPEN_METEO_POLLEN_TAXON_IDS,
  parseOpenMeteoPollenHourly,
  profileMatchesPollenTaxon,
} from './pollen-taxonomy';

describe('pollen taxonomy', () => {
  it('exposes all Open-Meteo hourly pollen taxa', () => {
    expect(OPEN_METEO_POLLEN_TAXON_IDS).toEqual([
      'alder_pollen',
      'birch_pollen',
      'grass_pollen',
      'mugwort_pollen',
      'olive_pollen',
      'ragweed_pollen',
    ]);
  });

  it('matches profile allergens by taxon id, not substring', () => {
    expect(profileMatchesPollenTaxon(['birch-pollen'], 'birch_pollen')).toBe(true);
    expect(profileMatchesPollenTaxon(['milk'], 'birch_pollen')).toBe(false);
    expect(profileMatchesPollenTaxon(['birch-pollen'], 'oak_pollen')).toBe(true);
    expect(profileMatchesPollenTaxon(['milk'], 'oak_pollen')).toBe(false);
    expect(profileMatchesPollenTaxon(['alder-pollen'], 'alder_pollen')).toBe(true);
    expect(profileMatchesPollenTaxon(['olive-pollen'], 'olive_pollen')).toBe(true);
  });

  it('parses Open-Meteo hourly data by taxon id', () => {
    const readings = parseOpenMeteoPollenHourly(
      {
        birch_pollen: [1, 40, 2],
        grass_pollen: [0, 5],
        ragweed_pollen: [100],
      },
      ['birch-pollen', 'grass-pollen'],
    );

    expect(readings.find((r) => r.taxonId === 'birch_pollen')).toMatchObject({
      value: 40,
      profileRelevant: true,
    });
    expect(readings.find((r) => r.taxonId === 'grass_pollen')?.profileRelevant).toBe(true);
    expect(readings.find((r) => r.taxonId === 'ragweed_pollen')?.profileRelevant).toBe(false);
  });
});
