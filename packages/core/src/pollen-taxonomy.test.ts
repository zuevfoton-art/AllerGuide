import { describe, expect, it } from 'vitest';
import {
  OPEN_METEO_POLLEN_TAXON_IDS,
  parseOpenMeteoPollenHourly,
  profileMatchesPollenTaxon,
  resolvePollenTaxonMatch,
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

  it('resolves exact, related, and none matches after dedicated catalog rows', () => {
    expect(resolvePollenTaxonMatch(['oak-pollen'], 'oak_pollen')).toBe('exact');
    expect(resolvePollenTaxonMatch(['birch-pollen'], 'oak_pollen')).toBe('related');
    expect(resolvePollenTaxonMatch(['hazel-pollen'], 'hazel_pollen')).toBe('exact');
    expect(resolvePollenTaxonMatch(['birch-pollen'], 'hazel_pollen')).toBe('related');
    expect(resolvePollenTaxonMatch(['hazelnut'], 'hazel_pollen')).toBe('none');
    expect(resolvePollenTaxonMatch(['olive-pollen'], 'ash_pollen')).toBe('related');
    expect(resolvePollenTaxonMatch(['birch-pollen'], 'ash_pollen')).toBe('none');
    expect(resolvePollenTaxonMatch(['birch-pollen'], 'maple_pollen')).toBe('none');
    expect(resolvePollenTaxonMatch(['birch-pollen'], 'willow_pollen')).toBe('none');
    expect(resolvePollenTaxonMatch(['birch-pollen'], 'poplar_pollen')).toBe('none');
    expect(resolvePollenTaxonMatch(['mugwort-pollen'], 'saltwort_pollen')).toBe('none');
    expect(resolvePollenTaxonMatch(['saltwort-pollen'], 'saltwort_pollen')).toBe('exact');
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
