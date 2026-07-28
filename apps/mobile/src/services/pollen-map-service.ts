import {
  buildNearbyPollenSamplePoints,
  buildYandexPollenUrl,
  parseOpenMeteoCurrentPollen,
  parseCurrentPollenMapReadings,
  parseProfileAllergenIds,
  POLLEN_MAP_TAXON_IDS,
  type NearbyPollenLocation,
  type NearbyPollenSamplePoint,
  type OpenMeteoCurrentPollen,
  type OpenMeteoPollenHourly,
  type PollenMapReading,
} from '@allerguide/core';
import type { ResolvedLocation } from '@/src/services/location-service';
import { getSetting, setSetting } from '@/src/services/settings-service';
import { logCaughtError } from '@/src/services/error-reporting';

export type PollenMapSource = 'open-meteo' | 'cache' | 'calendar';

export interface PollenMapSnapshot {
  source: PollenMapSource;
  readings: PollenMapReading[];
  nearbyLocations: NearbyPollenLocation[];
  updatedAt: string | null;
  yandexPollenUrl: string;
}

interface CachedPollenMapSnapshot {
  readings: PollenMapReading[];
  nearbyLocations: NearbyPollenLocation[];
  updatedAt: string;
}

interface OpenMeteoPollenResponse {
  current?: OpenMeteoCurrentPollen;
  hourly?: OpenMeteoPollenHourly;
}

interface OpenMeteoNearbyResponse {
  current?: OpenMeteoCurrentPollen;
}

const POLLEN_CACHE_PREFIX = 'pollenMapSnapshot';
const POLLEN_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export async function fetchPollenMapSnapshot(
  location: ResolvedLocation,
  profileAllergiesJson: string,
): Promise<PollenMapSnapshot> {
  const yandexPollenUrl = buildYandexPollenUrl(location.regionId);
  const profileAllergenIds = parseProfileAllergenIds(profileAllergiesJson);
  const cacheKey = buildCacheKey(location.lat, location.lon);

  try {
    const response = await fetch(buildOpenMeteoUrl(location));
    if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);

    const payload = (await response.json()) as OpenMeteoPollenResponse;
    const readings = parseCurrentPollenMapReadings(
      payload.hourly ?? {},
      payload.current?.time,
      profileAllergenIds,
    );
    if (readings.length === 0) throw new Error('Open-Meteo returned no pollen data');

    const nearbyLocations = await fetchNearbyPollenLocations(
      location,
      profileAllergenIds,
    );
    const updatedAt = new Date().toISOString();
    writeCache(cacheKey, { readings, nearbyLocations, updatedAt });
    return {
      source: 'open-meteo',
      readings,
      nearbyLocations,
      updatedAt,
      yandexPollenUrl,
    };
  } catch (error) {
    logCaughtError('fetchPollenMapSnapshot', error, { level: 'warn' });
  }

  const cached = readCache(cacheKey);
  if (cached) {
    return {
      source: 'cache',
      readings: applyProfileRelevance(cached.readings, profileAllergenIds),
      nearbyLocations: cached.nearbyLocations.map((nearbyLocation) => ({
        ...nearbyLocation,
        readings: applyProfileRelevance(nearbyLocation.readings, profileAllergenIds),
      })),
      updatedAt: cached.updatedAt,
      yandexPollenUrl,
    };
  }

  return {
    source: 'calendar',
    readings: [],
    nearbyLocations: [],
    updatedAt: null,
    yandexPollenUrl,
  };
}

function buildOpenMeteoUrl(location: ResolvedLocation): string {
  const taxa = POLLEN_MAP_TAXON_IDS.join(',');
  const timezone = encodeURIComponent('auto');
  return (
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.lat}` +
    `&longitude=${location.lon}&timezone=${timezone}&forecast_days=1` +
    `&current=${taxa}&hourly=${taxa}`
  );
}

function buildCacheKey(latitude: number, longitude: number): string {
  return `${POLLEN_CACHE_PREFIX}:${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
}

async function fetchNearbyPollenLocations(
  location: ResolvedLocation,
  profileAllergenIds: string[],
): Promise<NearbyPollenLocation[]> {
  const samplePoints = buildNearbyPollenSamplePoints(location.lat, location.lon);

  try {
    const response = await fetch(buildNearbyOpenMeteoUrl(samplePoints));
    if (!response.ok) throw new Error(`Open-Meteo nearby HTTP ${response.status}`);

    const payload = (await response.json()) as OpenMeteoNearbyResponse[];
    if (!Array.isArray(payload)) throw new Error('Open-Meteo nearby returned invalid data');

    return samplePoints.flatMap((point, index) => {
      const readings = parseOpenMeteoCurrentPollen(
        payload[index]?.current ?? {},
        profileAllergenIds,
      );
      return readings.length > 0 ? [{ ...point, readings }] : [];
    });
  } catch (error) {
    logCaughtError('fetchNearbyPollenLocations', error, { level: 'warn' });
    return [];
  }
}

function buildNearbyOpenMeteoUrl(points: NearbyPollenSamplePoint[]): string {
  const latitudes = points.map((point) => point.latitude.toFixed(4)).join(',');
  const longitudes = points.map((point) => point.longitude.toFixed(4)).join(',');
  const taxa = POLLEN_MAP_TAXON_IDS.join(',');
  return (
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitudes}` +
    `&longitude=${longitudes}&timezone=auto&forecast_days=1&current=${taxa}`
  );
}

function readCache(cacheKey: string): CachedPollenMapSnapshot | null {
  const raw = getSetting(cacheKey);
  if (!raw) return null;

  try {
    const cached = JSON.parse(raw) as CachedPollenMapSnapshot;
    const age = Date.now() - Date.parse(cached.updatedAt);
    if (!Array.isArray(cached.readings) || Number.isNaN(age) || age > POLLEN_CACHE_TTL_MS) {
      return null;
    }
    return {
      ...cached,
      nearbyLocations: Array.isArray(cached.nearbyLocations) ? cached.nearbyLocations : [],
    };
  } catch (error) {
    logCaughtError('readPollenMapCache', error, { level: 'warn' });
    return null;
  }
}

function writeCache(cacheKey: string, snapshot: CachedPollenMapSnapshot): void {
  setSetting(cacheKey, JSON.stringify(snapshot));
}

function applyProfileRelevance(
  readings: PollenMapReading[],
  profileAllergenIds: string[],
): PollenMapReading[] {
  return readings.map((reading) => ({
    ...reading,
    profileRelevant: Boolean(
      reading.allergenId && profileAllergenIds.includes(reading.allergenId),
    ),
  }));
}
