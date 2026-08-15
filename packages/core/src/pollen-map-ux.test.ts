import { describe, expect, it } from 'vitest';
import {
  clampPollenUpiIndex,
  pollenTierFromUpi,
  pollenUpiCategory,
  pollenUpiFromConcentration,
  resolvePollenUpiDisplay,
} from './pollen-upi';
import {
  parseDailyPollenForecast,
  POLLEN_TYPE_GROUP_BY_TAXON,
  readingToUpiSnapshot,
} from './pollen-map';
import {
  buildPollenPlantDetail,
  GOOGLE_POLLEN_PLANT_CODES,
  googlePlantCodeToTaxon,
} from './pollen-plant-detail';
import { getPollenTaxon } from './pollen-taxonomy';
import {
  adairClinicToMapPoi,
  catalogPlaceToMapPoi,
  dedupeMapPoisByPlaceId,
  filterMapPoisByCategory,
  googlePlaceToMapPoi,
} from './map-poi';
import { CATALOG_PLACES } from './catalog';
import { ADAIR_CLINICS } from './adair-catalog';

describe('pollen-upi', () => {
  it('clamps Google index values into 0–5', () => {
    expect(clampPollenUpiIndex(-1)).toBe(0);
    expect(clampPollenUpiIndex(0)).toBe(0);
    expect(clampPollenUpiIndex(1.4)).toBe(1);
    expect(clampPollenUpiIndex(2.5)).toBe(3);
    expect(clampPollenUpiIndex(5)).toBe(5);
    expect(clampPollenUpiIndex(9)).toBe(5);
    expect(pollenUpiCategory(0)).toBe('none');
    expect(pollenUpiCategory(5)).toBe('very_high');
  });

  it('prefers Google category labels in the display contract', () => {
    const display = resolvePollenUpiDisplay({
      index: 3,
      category: 'Moderate',
      source: 'google',
    });
    expect(display.category).toBe('moderate');
    expect(display.categorySource).toBe('google');
    expect(display.color).toMatch(/^#/);
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
  it('resolves every documented Google plant code to a known taxon', () => {
    expect(GOOGLE_POLLEN_PLANT_CODES).toHaveLength(17);
    for (const code of GOOGLE_POLLEN_PLANT_CODES) {
      const taxonId = googlePlantCodeToTaxon(code);
      expect(taxonId, `plant code ${code} must map to a taxon`).not.toBeNull();
      expect(getPollenTaxon(taxonId!)?.labelRu).toBeTruthy();
      expect(POLLEN_TYPE_GROUP_BY_TAXON[taxonId!]).toBeTruthy();
    }
    expect(googlePlantCodeToTaxon('COTTONWOOD')).toBe('poplar_pollen');
    expect(googlePlantCodeToTaxon('ASH')).toBe('ash_pollen');
    expect(googlePlantCodeToTaxon('JAPANESE_CEDAR')).toBe('japanese_cedar_pollen');
    expect(googlePlantCodeToTaxon('UNKNOWN_PLANT')).toBeNull();
  });

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
    expect(google?.level).toBe('medium');
    expect(google?.rating).toBe(4.5);
    expect(google?.allergySafety).toBe('unknown');
    expect(restaurant.allergySafety).toBe('curated');
    expect(clinic.allergySafety).toBe('verified');
    expect(filterMapPoisByCategory([restaurant, pharmacy, clinic], ['medical'])).toEqual([
      clinic,
    ]);
  });

  it('classifies cafes from Google place types', () => {
    const cafe = googlePlaceToMapPoi({
      placeId: 'cafe1',
      name: 'Coffee Lab',
      lat: 55.75,
      lng: 37.59,
      types: ['cafe', 'coffee_shop', 'food'],
      rating: 4.8,
    });
    expect(cafe).toMatchObject({ category: 'cafe', icon: 'cafe' });

    const bakery = googlePlaceToMapPoi({
      placeId: 'bak1',
      name: 'Bread & Co',
      lat: 55.75,
      lng: 37.6,
      types: ['bakery'],
    });
    expect(bakery?.category).toBe('cafe');
  });

  it('dedupes Google POIs by place id and does not treat rating as safety', () => {
    const first = googlePlaceToMapPoi({
      placeId: 'abc',
      name: 'Cafe A',
      lat: 55.75,
      lng: 37.62,
      rating: 4.9,
    });
    const duplicate = googlePlaceToMapPoi({
      placeId: 'abc',
      name: 'Cafe A copy',
      lat: 55.75,
      lng: 37.62,
      rating: 1,
    });
    expect(dedupeMapPoisByPlaceId([first!, duplicate!])).toHaveLength(1);
    expect(first?.allergySafety).toBe('unknown');
  });
});
