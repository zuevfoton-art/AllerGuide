import { describe, expect, it } from 'vitest';
import {
  buildYandexPollenUrl,
  parseCurrentPollenMapReadings,
  POLLEN_MAP_TAXON_IDS,
} from './pollen-map';

describe('pollen-map', () => {
  it('parses the current hour for the three map taxa', () => {
    const readings = parseCurrentPollenMapReadings(
      {
        time: ['2026-07-28T09:00', '2026-07-28T10:00'],
        birch_pollen: [1, 90],
        grass_pollen: [2, 8],
        ragweed_pollen: [3, 35],
      },
      '2026-07-28T10:00',
      ['birch-pollen'],
    );

    expect(readings.map((reading) => reading.taxonId)).toEqual(POLLEN_MAP_TAXON_IDS);
    expect(readings.map((reading) => reading.level)).toEqual(['high', 'mid', 'high']);
    expect(readings[0]?.profileRelevant).toBe(true);
    expect(readings[1]?.profileRelevant).toBe(false);
  });

  it('omits missing CAMS values instead of treating them as zero', () => {
    const readings = parseCurrentPollenMapReadings(
      {
        time: ['2026-07-28T10:00'],
        birch_pollen: [null],
        grass_pollen: [4],
      },
      '2026-07-28T10:00',
      [],
    );

    expect(readings).toHaveLength(1);
    expect(readings[0]?.taxonId).toBe('grass_pollen');
  });

  it('builds a supported Yandex Weather pollen URL', () => {
    expect(buildYandexPollenUrl('saint-petersburg')).toBe(
      'https://yandex.ru/pogoda/ru/saint-petersburg/allergies',
    );
    expect(buildYandexPollenUrl('unknown')).toContain('/moscow/allergies');
  });
});
