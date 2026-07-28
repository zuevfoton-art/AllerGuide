import { describe, expect, it } from 'vitest';
import {
  buildNearbyPollenSamplePoints,
  buildYandexPollenUrl,
  parseOpenMeteoCurrentPollen,
  parseCurrentPollenMapReadings,
  POLLEN_MAP_TAXON_IDS,
  resolveScaledPollenReading,
  selectLowPollenLocations,
} from './pollen-map';

describe('pollen-map', () => {
  it('parses the current hour for all supported map taxa', () => {
    const readings = parseCurrentPollenMapReadings(
      {
        time: ['2026-07-28T09:00', '2026-07-28T10:00'],
        birch_pollen: [1, 90],
        grass_pollen: [2, 8],
        ragweed_pollen: [3, 35],
        alder_pollen: [2, 5],
        mugwort_pollen: [2, 8],
        olive_pollen: [2, 50],
      },
      '2026-07-28T10:00',
      ['birch-pollen'],
    );

    expect(readings.map((reading) => reading.taxonId)).toEqual(POLLEN_MAP_TAXON_IDS);
    expect(readings.map((reading) => reading.level)).toEqual([
      'high',
      'mid',
      'high',
      'low',
      'mid',
      'high',
    ]);
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

  it('builds eight nearby sample points around the user', () => {
    const points = buildNearbyPollenSamplePoints(55.75, 37.62);

    expect(points).toHaveLength(8);
    expect(points.map((point) => point.direction)).toContain('north');
    expect(points.every((point) => point.distanceKm === 20)).toBe(true);
  });

  it('selects and sorts only low-pollen nearby locations', () => {
    const low = parseOpenMeteoCurrentPollen({ grass_pollen: 2 }, []);
    const high = parseOpenMeteoCurrentPollen({ grass_pollen: 30 }, []);
    const safer = parseOpenMeteoCurrentPollen({ grass_pollen: 1 }, []);
    const locations = [
      { latitude: 1, longitude: 1, distanceKm: 20, direction: 'north' as const, readings: low },
      { latitude: 2, longitude: 2, distanceKm: 20, direction: 'east' as const, readings: high },
      { latitude: 3, longitude: 3, distanceKm: 20, direction: 'south' as const, readings: safer },
    ];

    const selected = selectLowPollenLocations(locations, 'grass_pollen');

    expect(selected.map((location) => location.direction)).toEqual(['south', 'north']);
  });

  it('resolves one pollen level from the current map scale', () => {
    const center = parseOpenMeteoCurrentPollen({ birch_pollen: 10 }, ['birch-pollen']);
    const nearby = [
      {
        latitude: 1,
        longitude: 1,
        distanceKm: 20,
        direction: 'north' as const,
        readings: parseOpenMeteoCurrentPollen({ birch_pollen: 40 }, []),
      },
      {
        latitude: 2,
        longitude: 2,
        distanceKm: 20,
        direction: 'south' as const,
        readings: parseOpenMeteoCurrentPollen({ birch_pollen: 20 }, []),
      },
    ];

    expect(resolveScaledPollenReading(center, nearby, 'birch_pollen', 'place')?.value).toBe(10);
    expect(resolveScaledPollenReading(center, nearby, 'birch_pollen', 'city')?.value).toBe(23.3);
    expect(resolveScaledPollenReading(center, nearby, 'birch_pollen', 'region')?.value).toBe(40);
  });
});
