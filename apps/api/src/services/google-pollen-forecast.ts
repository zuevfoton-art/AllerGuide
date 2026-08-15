import {
  normalizeGooglePollenForecast,
  type GooglePollenForecastResult,
} from '@allerguide/core';

const GOOGLE_POLLEN_API_BASE_URL = 'https://pollen.googleapis.com/v1';
const FORECAST_CACHE_TTL_MS = 30 * 60 * 1000;
const FORECAST_DAYS = 5;

export type {
  GooglePlantCoverageEntry,
  GooglePollenForecastDay,
  GooglePollenForecastResult,
} from '@allerguide/core';

interface CacheEntry {
  expiresAt: number;
  value: GooglePollenForecastResult;
}

const forecastCache = new Map<string, CacheEntry>();

export function isGooglePollenForecastConfigured(): boolean {
  return (
    process.env.POLLEN_HEATMAP_ENABLED === 'true' &&
    Boolean(process.env.GOOGLE_POLLEN_API_KEY?.trim())
  );
}

const DEFAULT_FORECAST_LANGUAGE = 'en';

export function buildGooglePollenForecastUrl(
  latitude: number,
  longitude: number,
  days = FORECAST_DAYS,
  languageCode = DEFAULT_FORECAST_LANGUAGE,
): string {
  const apiKey = process.env.GOOGLE_POLLEN_API_KEY?.trim();
  if (!apiKey) throw new Error('GOOGLE_POLLEN_API_KEY is not configured');

  const params = new URLSearchParams({
    key: apiKey,
    'location.latitude': String(latitude),
    'location.longitude': String(longitude),
    days: String(days),
    plantsDescription: 'true',
    languageCode,
  });

  return `${GOOGLE_POLLEN_API_BASE_URL}/forecast:lookup?${params.toString()}`;
}

export async function fetchGooglePollenForecast(
  latitude: number,
  longitude: number,
  languageCode = DEFAULT_FORECAST_LANGUAGE,
): Promise<GooglePollenForecastResult> {
  const cacheKey = `${latitude.toFixed(2)}:${longitude.toFixed(2)}:${languageCode}`;
  const cached = forecastCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const response = await fetch(
    buildGooglePollenForecastUrl(latitude, longitude, FORECAST_DAYS, languageCode),
    {
      headers: { Accept: 'application/json' },
    },
  );
  if (!response.ok) {
    throw new Error(`Google Pollen Forecast HTTP ${response.status}`);
  }

  const payload = (await response.json()) as Parameters<typeof normalizeGooglePollenForecast>[0];
  const value = normalizeGooglePollenForecast(payload);
  forecastCache.set(cacheKey, {
    expiresAt: Date.now() + FORECAST_CACHE_TTL_MS,
    value,
  });
  return value;
}

/** Test helper — clear in-memory forecast cache between cases. */
export function clearGooglePollenForecastCache(): void {
  forecastCache.clear();
}

export function peekGooglePollenForecastCacheSize(): number {
  return forecastCache.size;
}
