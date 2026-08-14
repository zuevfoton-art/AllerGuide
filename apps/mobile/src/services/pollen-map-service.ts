import {
  buildForecastDaysFromGoogle,
  buildNearbyPollenSamplePoints,
  buildPollenPlantDetail,
  buildYandexPollenUrl,
  mergeGoogleAndOpenMeteoMapReadings,
  parseOpenMeteoCurrentPollen,
  parseCurrentPollenMapReadings,
  parseDailyPollenForecast,
  parseProfileAllergenIds,
  OPEN_METEO_POLLEN_MAP_TAXON_IDS,
  POLLEN_OPEN_METEO_FORECAST_DAYS,
  type GoogleForecastDayInput,
  type NearbyPollenLocation,
  type NearbyPollenSamplePoint,
  type OpenMeteoCurrentPollen,
  type OpenMeteoPollenHourly,
  type PollenForecastDay,
  type PollenMapReading,
  type PollenMapTaxonId,
  type PollenPlantDetail,
  type PollenUpiSnapshot,
} from '@allerguide/core';
import type { ResolvedLocation } from '@/src/services/location-service';
import { apiRequest, getApiBaseUrl } from '@/src/services/api-client';
import { getLocale, getSetting, setSetting } from '@/src/services/settings-service';
import { logCaughtError } from '@/src/services/error-reporting';
import { trackEvent } from '@/src/services/analytics-service';
import {
  GOOGLE_POLLEN_HEATMAP_ENABLED,
  MAP_POLLEN_GOOGLE_PRIMARY,
} from '@/src/constants/features';

export type PollenMapSource = 'google' | 'open-meteo' | 'cache' | 'calendar';

export interface PollenMapSnapshot {
  source: PollenMapSource;
  readings: PollenMapReading[];
  nearbyLocations: NearbyPollenLocation[];
  forecastDays: PollenForecastDay[];
  /** UPI per taxon for today (Google Forecast preferred). */
  upiByTaxon: Partial<Record<PollenMapTaxonId, PollenUpiSnapshot>>;
  plants: Partial<Record<PollenMapTaxonId, PollenPlantDetail>>;
  updatedAt: string | null;
  yandexPollenUrl: string;
}

interface CachedPollenMapSnapshot {
  readings: PollenMapReading[];
  nearbyLocations: NearbyPollenLocation[];
  forecastDays: PollenForecastDay[];
  upiByTaxon: Partial<Record<PollenMapTaxonId, PollenUpiSnapshot>>;
  plants: Partial<Record<PollenMapTaxonId, PollenPlantDetail>>;
  updatedAt: string;
}

interface OpenMeteoPollenResponse {
  current?: OpenMeteoCurrentPollen;
  hourly?: OpenMeteoPollenHourly;
}

interface OpenMeteoNearbyResponse {
  current?: OpenMeteoCurrentPollen;
}

interface GoogleForecastApiDay extends GoogleForecastDayInput {
  plants?: Partial<Record<PollenMapTaxonId, PollenPlantDetail>>;
}

interface GoogleForecastApiResult {
  regionCode?: string | null;
  days?: GoogleForecastApiDay[];
  plants?: Partial<Record<PollenMapTaxonId, PollenPlantDetail>>;
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

  if (MAP_POLLEN_GOOGLE_PRIMARY) {
    const googleSnapshot = await tryFetchGooglePrimarySnapshot(
      location,
      profileAllergenIds,
      cacheKey,
      yandexPollenUrl,
    );
    if (googleSnapshot) {
      trackEvent('map_pollen_refreshed', { source: 'google', nearby: googleSnapshot.nearbyLocations.length });
      return googleSnapshot;
    }
    trackEvent('map_pollen_fallback', { from: 'google', reason: 'google_unavailable' });
    // Emergency fallback: Open-Meteo only when Google primary fails.
  }

  try {
    const openMeteoSnapshot = await fetchOpenMeteoSnapshot(
      location,
      profileAllergenIds,
      cacheKey,
      yandexPollenUrl,
    );
    trackEvent('map_pollen_refreshed', {
      source: 'open-meteo',
      nearby: openMeteoSnapshot.nearbyLocations.length,
      google_primary: MAP_POLLEN_GOOGLE_PRIMARY,
    });
    return openMeteoSnapshot;
  } catch (error) {
    logCaughtError('fetchPollenMapSnapshot', error, { level: 'warn' });
  }

  const fallback = readCachedOrCalendar(cacheKey, profileAllergenIds, yandexPollenUrl);
  trackEvent('map_pollen_fallback', {
    from: MAP_POLLEN_GOOGLE_PRIMARY ? 'google' : 'open-meteo',
    to: fallback.source,
    reason: fallback.source === 'cache' ? 'network_cache' : 'calendar',
  });
  trackEvent('map_pollen_refreshed', { source: fallback.source, nearby: fallback.nearbyLocations.length });
  return fallback;
}

async function tryFetchGooglePrimarySnapshot(
  location: ResolvedLocation,
  profileAllergenIds: string[],
  cacheKey: string,
  yandexPollenUrl: string,
): Promise<PollenMapSnapshot | null> {
  try {
    const google = await fetchGoogleForecast(location.lat, location.lon);
    if (!google?.days?.length) return null;

    const today = google.days[0]!;
    // OM fills birch/alder/olive when Google plantInfo has no indexInfo.
    const openMeteoReadings = await fetchOpenMeteoCenterReadings(location, profileAllergenIds);
    const merged = mergeGoogleAndOpenMeteoMapReadings(
      today,
      openMeteoReadings,
      profileAllergenIds,
    );
    if (merged.readings.length === 0) return null;

    const forecastDays = buildForecastDaysFromGoogle(google.days, profileAllergenIds);
    const plants = buildPlantsMap(merged.readings, google.plants);
    // Secondary: Open-Meteo ring samples for “safe nearby” (not Google × N lookups).
    const nearbyLocations = await fetchNearbyPollenLocations(location, profileAllergenIds);
    const updatedAt = new Date().toISOString();

    writeCache(cacheKey, {
      readings: merged.readings,
      nearbyLocations,
      forecastDays,
      upiByTaxon: merged.upiByTaxon,
      plants,
      updatedAt,
    });

    return {
      source: 'google',
      readings: merged.readings,
      nearbyLocations,
      forecastDays,
      upiByTaxon: merged.upiByTaxon,
      plants,
      updatedAt,
      yandexPollenUrl,
    };
  } catch (error) {
    logCaughtError('tryFetchGooglePrimarySnapshot', error, { level: 'warn' });
    return null;
  }
}

async function fetchOpenMeteoSnapshot(
  location: ResolvedLocation,
  profileAllergenIds: string[],
  cacheKey: string,
  yandexPollenUrl: string,
): Promise<PollenMapSnapshot> {
  const response = await fetch(buildOpenMeteoUrl(location));
  if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);

  const payload = (await response.json()) as OpenMeteoPollenResponse;
  const readings = parseCurrentPollenMapReadings(
    payload.hourly ?? {},
    payload.current?.time,
    profileAllergenIds,
  );
  if (readings.length === 0) throw new Error('Open-Meteo returned no pollen data');

  const forecastDays = parseDailyPollenForecast(payload.hourly ?? {}, profileAllergenIds);
  const nearbyLocations = await fetchNearbyPollenLocations(location, profileAllergenIds);
  const google = await fetchGoogleForecast(location.lat, location.lon);
  // Prefer Google plant UPI; synthesize chips for plant-only taxa missing from OM.
  const merged = mergeGoogleAndOpenMeteoMapReadings(
    google?.days?.[0],
    readings,
    profileAllergenIds,
  );
  const plants = buildPlantsMap(merged.readings, google?.plants);

  const updatedAt = new Date().toISOString();
  writeCache(cacheKey, {
    readings: merged.readings,
    nearbyLocations,
    forecastDays,
    upiByTaxon: merged.upiByTaxon,
    plants,
    updatedAt,
  });
  return {
    source: 'open-meteo',
    readings: merged.readings,
    nearbyLocations,
    forecastDays,
    upiByTaxon: merged.upiByTaxon,
    plants,
    updatedAt,
    yandexPollenUrl,
  };
}

async function fetchOpenMeteoCenterReadings(
  location: ResolvedLocation,
  profileAllergenIds: string[],
): Promise<PollenMapReading[]> {
  try {
    const response = await fetch(buildOpenMeteoUrl(location));
    if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
    const payload = (await response.json()) as OpenMeteoPollenResponse;
    return parseCurrentPollenMapReadings(
      payload.hourly ?? {},
      payload.current?.time,
      profileAllergenIds,
    );
  } catch (error) {
    logCaughtError('fetchOpenMeteoCenterReadings', error, { level: 'warn' });
    return [];
  }
}

function readCachedOrCalendar(
  cacheKey: string,
  profileAllergenIds: string[],
  yandexPollenUrl: string,
): PollenMapSnapshot {
  const cached = readCache(cacheKey);
  if (cached) {
    return {
      source: 'cache',
      readings: applyProfileRelevance(cached.readings, profileAllergenIds),
      nearbyLocations: cached.nearbyLocations.map((nearbyLocation) => ({
        ...nearbyLocation,
        readings: applyProfileRelevance(nearbyLocation.readings, profileAllergenIds),
      })),
      forecastDays: cached.forecastDays.map((day) => ({
        ...day,
        readings: applyProfileRelevance(day.readings, profileAllergenIds),
      })),
      upiByTaxon: cached.upiByTaxon,
      plants: cached.plants,
      updatedAt: cached.updatedAt,
      yandexPollenUrl,
    };
  }

  return {
    source: 'calendar',
    readings: [],
    nearbyLocations: [],
    forecastDays: [],
    upiByTaxon: {},
    plants: {},
    updatedAt: null,
    yandexPollenUrl,
  };
}

function buildOpenMeteoUrl(location: ResolvedLocation): string {
  const taxa = OPEN_METEO_POLLEN_MAP_TAXON_IDS.join(',');
  const timezone = encodeURIComponent('auto');
  return (
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.lat}` +
    `&longitude=${location.lon}&timezone=${timezone}&forecast_days=${POLLEN_OPEN_METEO_FORECAST_DAYS}` +
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
  const taxa = OPEN_METEO_POLLEN_MAP_TAXON_IDS.join(',');
  return (
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitudes}` +
    `&longitude=${longitudes}&timezone=auto&forecast_days=1&current=${taxa}`
  );
}

function isGoogleForecastClientEnabled(): boolean {
  return (
    (MAP_POLLEN_GOOGLE_PRIMARY || GOOGLE_POLLEN_HEATMAP_ENABLED) &&
    Boolean(getApiBaseUrl().trim())
  );
}

async function fetchGoogleForecast(
  latitude: number,
  longitude: number,
): Promise<GoogleForecastApiResult | null> {
  if (!isGoogleForecastClientEnabled()) return null;

  // App locale localizes Google plant names/descriptions (plant sheet).
  const lang = getLocale() ?? 'ru';
  const response = await apiRequest<{ ok?: boolean; forecast?: GoogleForecastApiResult }>(
    `/api/pollen/forecast?lat=${latitude}&lon=${longitude}&lang=${lang}`,
  );
  if (!response.ok || !response.data.forecast) return null;
  return response.data.forecast;
}

function buildPlantsMap(
  readings: PollenMapReading[],
  googlePlants: Partial<Record<PollenMapTaxonId, PollenPlantDetail>> | undefined,
): Partial<Record<PollenMapTaxonId, PollenPlantDetail>> {
  const plants: Partial<Record<PollenMapTaxonId, PollenPlantDetail>> = {
    ...(googlePlants ?? {}),
  };

  for (const reading of readings) {
    if (!plants[reading.taxonId]) {
      plants[reading.taxonId] = buildPollenPlantDetail(reading.taxonId);
    }
  }

  return plants;
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
      forecastDays: Array.isArray(cached.forecastDays) ? cached.forecastDays : [],
      upiByTaxon: cached.upiByTaxon ?? {},
      plants: cached.plants ?? {},
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
