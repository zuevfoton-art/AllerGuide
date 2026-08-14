import {
  normalizeGoogleAirQuality,
  type AirQualitySnapshot,
  type GoogleAirQualityCurrentPayload,
  type GoogleAirQualityMapType,
} from '@allerguide/core';

/**
 * Google Air Quality API proxy (same pattern as the Pollen proxy): the mobile
 * client never holds the Google key, responses are cached in memory.
 * @see https://developers.google.com/maps/documentation/air-quality
 */
const GOOGLE_AIR_QUALITY_API_BASE_URL = 'https://airquality.googleapis.com/v1';
const CURRENT_CACHE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_LANGUAGE_CODE = 'ru';

interface CacheEntry {
  expiresAt: number;
  value: AirQualitySnapshot;
}

const currentConditionsCache = new Map<string, CacheEntry>();

export function isGoogleAirQualityConfigured(): boolean {
  if (process.env.AIR_QUALITY_ENABLED !== 'true') return false;
  return Boolean(resolveAirQualityApiKey({ optional: true }));
}

function resolveAirQualityApiKey(options?: { optional?: boolean }): string | null {
  const key =
    process.env.GOOGLE_AIR_QUALITY_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim();
  if (!key && !options?.optional) {
    throw new Error('Google Air Quality API key is not configured');
  }
  return key ?? null;
}

export function buildGoogleAirQualityCurrentRequest(
  latitude: number,
  longitude: number,
  languageCode = DEFAULT_LANGUAGE_CODE,
): { url: string; body: string } {
  const apiKey = resolveAirQualityApiKey();
  return {
    url: `${GOOGLE_AIR_QUALITY_API_BASE_URL}/currentConditions:lookup?key=${encodeURIComponent(apiKey!)}`,
    body: JSON.stringify({
      location: { latitude, longitude },
      universalAqi: true,
      extraComputations: [
        'HEALTH_RECOMMENDATIONS',
        'DOMINANT_POLLUTANT_CONCENTRATION',
        'POLLUTANT_CONCENTRATION',
        'LOCAL_AQI',
      ],
      languageCode,
    }),
  };
}

export async function fetchGoogleAirQualityCurrent(
  latitude: number,
  longitude: number,
  languageCode = DEFAULT_LANGUAGE_CODE,
): Promise<AirQualitySnapshot> {
  const cacheKey = `${latitude.toFixed(2)}:${longitude.toFixed(2)}:${languageCode}`;
  const cached = currentConditionsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const { url, body } = buildGoogleAirQualityCurrentRequest(latitude, longitude, languageCode);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body,
  });
  if (!response.ok) {
    throw new Error(`Google Air Quality HTTP ${response.status}`);
  }

  const payload = (await response.json()) as GoogleAirQualityCurrentPayload;
  const value = normalizeGoogleAirQuality(payload);
  currentConditionsCache.set(cacheKey, {
    expiresAt: Date.now() + CURRENT_CACHE_TTL_MS,
    value,
  });
  return value;
}

export function buildGoogleAirQualityHeatmapUrl(
  mapType: GoogleAirQualityMapType,
  zoom: number,
  x: number,
  y: number,
): string {
  const apiKey = resolveAirQualityApiKey();
  return (
    `${GOOGLE_AIR_QUALITY_API_BASE_URL}/mapTypes/${mapType}/heatmapTiles/` +
    `${zoom}/${x}/${y}?key=${encodeURIComponent(apiKey!)}`
  );
}

export async function fetchGoogleAirQualityHeatmapTile(
  mapType: GoogleAirQualityMapType,
  zoom: number,
  x: number,
  y: number,
): Promise<Response> {
  return fetch(buildGoogleAirQualityHeatmapUrl(mapType, zoom, x, y), {
    headers: { Accept: 'image/png' },
  });
}

/** Test helper — clear the in-memory current conditions cache. */
export function clearGoogleAirQualityCache(): void {
  currentConditionsCache.clear();
}
