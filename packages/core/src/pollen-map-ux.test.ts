import { describe, expect, it } from 'vitest';
import {
  clampPollenUpiIndex,
  pollenTierFromUpi,
  pollenUpiCategory,
  pollenUpiFromConcentration,
} from './pollen-upi';
import { parseDailyPollenForecast, readingToUpiSnapshot } from './pollen-map';
import { buildPollenPlantDetail, googlePlantCodeToTaxon } from './pollen-plant-detail';
import {
  adairClinicToMapPoi,
  catalogPlaceToMapPoi,
  filterMapPoisByCategory,
  googlePlaceToMapPoi,
} from './map-poi';
import { CATALOG_PLACES } from './catalog';
import { ADAIR_CLINICS } from './adair-catalog';

describe('pollen-upi', () => {
  it('clamps Google index values into 0–5', () => {
    expect(clampPollenUpiIndex(-1)).toBe(0);
    expect(clampPollenUpiIndex(1.4)).toBe(1);
    expect(clampPollenUpiIndex(9)).toBe(5);
  });

  it('maps concentration to an approximate UPI', () => {
    expect(pollenUpiFromConcentration(0, 'birch_pollen')).toBe(0);
    expect(pollenUpiFromConcentration(5, 'birch_pollen')).toBe(1);
    expect(pollenUpiFromConcentration(12, 'birch_pollen')).toBe(2);
    expect(pollenUpiFromConcentration(40, 'birch_pollen')).toBe(3);
    expect(pollenUpiCategory(3)).toBe('moderate');
    expect(pollenTierFromUpi(4)).toBe('high');
  });
});

describe('parseDailyPollenForecast', () => {
  it('builds daily peaks from hourly Open-Meteo series', () => {
    const days = parseDailyPollenForecast(
      {
        time: ['2026-07-28T09:00', '2026-07-28T15:00', '2026-07-29T10:00'],
        birch_pollen: [10, 40, 5],
        grass_pollen: [2, 3, 8],
      },
      ['birch-pollen'],
    );

    expect(days).toHaveLength(2);
    expect(days[0]).toMatchObject({ date: '2026-07-28' });
    expect(days[0]?.readings.find((r) => r.taxonId === 'birch_pollen')).toMatchObject({
      value: 40,
      profileRelevant: true,
    });
    expect(days[1]?.readings.find((r) => r.taxonId === 'grass_pollen')?.value).toBe(8);
  });
});

describe('pollen-plant-detail', () => {
  it('maps Google plant codes and attaches core cross-reactions', () => {
    expect(googlePlantCodeToTaxon('BIRCH')).toBe('birch_pollen');
    const detail = buildPollenPlantDetail('birch_pollen', {
      family: 'Betulaceae',
      season: 'Spring',
    });
    expect(detail.family).toBe('Betulaceae');
    expect(detail.crossReactionLabels.length).toBeGreaterThan(0);
    expect(readingToUpiSnapshot({
      taxonId: 'birch_pollen',
      allergenId: 'birch-pollen',
      value: 90,
      level: 'high',
      profileRelevant: true,
    }).index).toBeGreaterThanOrEqual(4);
  });
});

describe('map-poi', () => {
  it('converts catalog and ADAIR rows and filters by category', () => {
    const restaurant = catalogPlaceToMapPoi(CATALOG_PLACES[0]!);
    const pharmacy = catalogPlaceToMapPoi(
      CATALOG_PLACES.find((place) => place.icon === 'medkit')!,
    );
    const clinic = adairClinicToMapPoi(ADAIR_CLINICS[0]!);
    const google = googlePlaceToMapPoi({
      placeId: 'abc',
      name: 'Cafe',
      lat: 55.75,
      lng: 37.62,
      types: ['restaurant'],
      rating: 4.5,
    });

    expect(restaurant.category).toBe('restaurant');
    expect(pharmacy.category).toBe('pharmacy');
    expect(clinic.source).toBe('adair');
    expect(clinic.lat).toBe(ADAIR_CLINICS[0]!.latitude);
    expect(google?.level).toBe('high');
    expect(filterMapPoisByCategory([restaurant, pharmacy, clinic], ['medical'])).toEqual([
      clinic,
    ]);
  });
});
