import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '@allerguide/core';
import type { MapPlacesResult } from '@/src/services/place-service';
import type { PollenMapSnapshot } from '@/src/services/pollen-map-service';
import type { ResolvedLocation } from '@/src/services/location-service';
import {
  MAP_LIVE_REFRESH_MS,
  refreshMapLiveData,
  searchMapThisArea,
} from './use-map-live-data';

vi.mock('react-native', () => ({
  AppState: { currentState: 'active' },
}));

vi.mock('expo-router', () => ({
  useFocusEffect: vi.fn(),
}));

vi.mock('@/src/store/app-store', () => ({
  useAppStore: (selector: (state: { activeProfile: null }) => unknown) =>
    selector({ activeProfile: null }),
}));

vi.mock('@/src/services/location-service', () => ({
  getCurrentLocation: vi.fn(),
}));

vi.mock('@/src/services/pollen-map-service', () => ({
  fetchPollenMapSnapshot: vi.fn(),
}));

vi.mock('@/src/services/place-service', () => ({
  searchMapPlaces: vi.fn(),
  autocompleteMapPlaces: vi.fn(),
  fetchMapPlaceDetails: vi.fn(),
  createPlacesSessionToken: vi.fn(() => 'session-token'),
}));

vi.mock('@/src/services/wind-service', () => ({
  fetchWindSnapshot: vi.fn(),
}));

vi.mock('@/src/services/pollen-hourly-service', () => ({
  fetchPollenHourlySeries: vi.fn(),
}));

vi.mock('@/src/services/air-quality-service', () => ({
  fetchAirQualitySnapshot: vi.fn(),
  isGoogleAirQualityAvailable: vi.fn(() => false),
}));

vi.mock('@/src/services/settings-service', () => ({
  getLocale: vi.fn(() => 'ru'),
}));

vi.mock('@/src/constants/features', () => ({
  MAP_POLLEN_PLUME_ENABLED: false,
}));

import { getCurrentLocation } from '@/src/services/location-service';
import { fetchPollenMapSnapshot } from '@/src/services/pollen-map-service';
import { searchMapPlaces } from '@/src/services/place-service';

const location: ResolvedLocation = {
  lat: 55.75,
  lon: 37.62,
  label: 'Москва',
  regionId: 'moscow',
  source: 'gps',
};

const profile: Profile = {
  id: 1,
  name: 'Анна',
  birthYear: 1990,
  type: 'self',
  allergies: '["birch"]',
};

const pollenSnapshot = {
  source: 'open-meteo',
  readings: [],
  nearbyLocations: [],
  forecastDays: [],
  upiByTaxon: {},
  typeIndexes: {},
  plants: {},
  updatedAt: '2026-09-03T12:00:00Z',
  yandexPollenUrl: 'https://example.test/pollen',
} as PollenMapSnapshot;

const placesResult: MapPlacesResult = {
  pois: [
    {
      id: 'clinic-1',
      title: 'Клиника',
      note: '',
      category: 'medical',
      lat: 55.75,
      lng: 37.62,
      level: 'high',
      icon: 'medkit',
      tags: [],
      source: 'adair',
      allergySafety: 'curated',
    },
  ],
  source: 'adair',
  liveEmpty: false,
};

describe('useMapLiveData', () => {
  beforeEach(() => {
    vi.mocked(getCurrentLocation).mockReset();
    vi.mocked(fetchPollenMapSnapshot).mockReset();
    vi.mocked(searchMapPlaces).mockReset();
    vi.mocked(getCurrentLocation).mockResolvedValue(location);
    vi.mocked(fetchPollenMapSnapshot).mockResolvedValue(pollenSnapshot);
    vi.mocked(searchMapPlaces).mockResolvedValue(placesResult);
  });

  it('keeps the 15-minute live refresh interval', () => {
    expect(MAP_LIVE_REFRESH_MS).toBe(15 * 60 * 1000);
  });

  it('refresh loads location + pollen + places', async () => {
    const result = await refreshMapLiveData({
      placeQuery: '',
      placeFilters: ['adair', 'medical'],
      poiOrigin: null,
      profile,
    });

    expect(getCurrentLocation).toHaveBeenCalledTimes(1);
    expect(fetchPollenMapSnapshot).toHaveBeenCalledWith(location, '["birch"]');
    expect(searchMapPlaces).toHaveBeenCalledWith(
      profile,
      { latitude: 55.75, longitude: 37.62 },
      ['adair', 'medical'],
      '',
    );
    expect(result.coords).toEqual({ lat: 55.75, lon: 37.62, label: 'Москва' });
    expect(result.pollenSnapshot).toBe(pollenSnapshot);
    expect(result.placesResult).toBe(placesResult);
  });

  it('refresh uses poiOrigin for places when set', async () => {
    await refreshMapLiveData({
      placeQuery: 'кафе',
      placeFilters: ['cafe'],
      poiOrigin: { lat: 59.93, lon: 30.31 },
      profile,
    });

    expect(searchMapPlaces).toHaveBeenCalledWith(
      profile,
      { latitude: 59.93, longitude: 30.31 },
      ['cafe'],
      'кафе',
    );
    expect(fetchPollenMapSnapshot).toHaveBeenCalledWith(location, '["birch"]');
  });

  it('searchThisArea uses mapCenter', async () => {
    const mapCenter = { lat: 59.93, lon: 30.31 };
    const result = await searchMapThisArea({
      mapCenter,
      placeQuery: 'клиника',
      placeFilters: ['medical'],
      profile,
    });

    expect(searchMapPlaces).toHaveBeenCalledWith(
      profile,
      { latitude: 59.93, longitude: 30.31 },
      ['medical'],
      'клиника',
    );
    expect(getCurrentLocation).not.toHaveBeenCalled();
    expect(result).toEqual({
      origin: mapCenter,
      placesResult,
    });
  });

  it('searchThisArea no-ops without mapCenter', async () => {
    const result = await searchMapThisArea({
      mapCenter: null,
      placeQuery: '',
      placeFilters: ['adair'],
      profile,
    });

    expect(result).toBeNull();
    expect(searchMapPlaces).not.toHaveBeenCalled();
  });
});
