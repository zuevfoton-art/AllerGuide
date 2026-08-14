import {
  buildPollenPlantDetail,
  clampPollenUpiIndex,
  googlePlantCodeToTaxon,
  type PollenMapTaxonId,
  type PollenPlantDetail,
  type PollenUpiSnapshot,
} from '@allerguide/core';

const GOOGLE_POLLEN_API_BASE_URL = 'https://pollen.googleapis.com/v1';
const FORECAST_CACHE_TTL_MS = 30 * 60 * 1000;
const FORECAST_DAYS = 5;

export type GooglePlantCoverageEntry = {
  code: string;
  taxonId: PollenMapTaxonId | null;
  hasIndex: boolean;
};

export interface GooglePollenForecastDay {
  date: string;
  typeIndexes: Partial<Record<'TREE' | 'GRASS' | 'WEED', PollenUpiSnapshot>>;
  plantIndexes: Partial<Record<PollenMapTaxonId, PollenUpiSnapshot>>;
  plants: Partial<Record<PollenMapTaxonId, PollenPlantDetail>>;
  /** Raw plantInfo codes for staging debug (with/without indexInfo). */
  plantCoverage: GooglePlantCoverageEntry[];
}

export interface GooglePollenForecastResult {
  regionCode: string | null;
  days: GooglePollenForecastDay[];
  plants: Partial<Record<PollenMapTaxonId, PollenPlantDetail>>;
}

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

  const payload = (await response.json()) as GoogleForecastPayload;
  const value = normalizeGoogleForecast(payload);
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

interface GoogleForecastPayload {
  regionCode?: string;
  dailyInfo?: GoogleDayInfo[];
}

interface GoogleDayInfo {
  date?: { year?: number; month?: number; day?: number };
  pollenTypeInfo?: Array<{
    code?: string;
    indexInfo?: { value?: number; category?: string };
  }>;
  plantInfo?: Array<{
    code?: string;
    displayName?: string;
    indexInfo?: { value?: number; category?: string };
    plantDescription?: {
      family?: string;
      season?: string;
      specialColors?: string;
      specialShapes?: string;
      picture?: string;
      crossReaction?: string;
    };
  }>;
}

function normalizeGoogleForecast(payload: GoogleForecastPayload): GooglePollenForecastResult {
  const days: GooglePollenForecastDay[] = [];
  const plants: Partial<Record<PollenMapTaxonId, PollenPlantDetail>> = {};

  for (const dayInfo of payload.dailyInfo ?? []) {
    const date = formatGoogleDate(dayInfo.date);
    if (!date) continue;

    const typeIndexes: GooglePollenForecastDay['typeIndexes'] = {};
    for (const typeInfo of dayInfo.pollenTypeInfo ?? []) {
      const code = typeInfo.code?.toUpperCase();
      if (code !== 'TREE' && code !== 'GRASS' && code !== 'WEED') continue;
      if (typeof typeInfo.indexInfo?.value !== 'number') continue;
      typeIndexes[code] = {
        index: clampPollenUpiIndex(typeInfo.indexInfo.value),
        category: typeInfo.indexInfo.category,
        source: 'google',
      };
    }

    const plantIndexes: GooglePollenForecastDay['plantIndexes'] = {};
    const dayPlants: GooglePollenForecastDay['plants'] = {};
    const plantCoverage: GooglePlantCoverageEntry[] = [];

    for (const plant of dayInfo.plantInfo ?? []) {
      const code = typeof plant.code === 'string' ? plant.code.trim().toUpperCase() : '';
      if (!code) continue;
      const taxonId = googlePlantCodeToTaxon(code);
      const indexValue = plant.indexInfo?.value;
      const hasIndex = typeof indexValue === 'number';
      plantCoverage.push({ code, taxonId, hasIndex });

      if (!taxonId) continue;

      if (hasIndex) {
        plantIndexes[taxonId] = {
          index: clampPollenUpiIndex(indexValue),
          category: plant.indexInfo?.category,
          source: 'google',
        };
      }

      const detail = buildPollenPlantDetail(taxonId, {
        displayName: plant.displayName,
        family: plant.plantDescription?.family,
        season: plant.plantDescription?.season,
        specialColors: plant.plantDescription?.specialColors,
        specialShapes: plant.plantDescription?.specialShapes,
        picture: plant.plantDescription?.picture,
        crossReaction: plant.plantDescription?.crossReaction,
      });
      dayPlants[taxonId] = detail;
      if (!plants[taxonId]) plants[taxonId] = detail;
    }

    days.push({ date, typeIndexes, plantIndexes, plants: dayPlants, plantCoverage });
  }

  return {
    regionCode: payload.regionCode ?? null,
    days,
    plants,
  };
}

function formatGoogleDate(date: GoogleDayInfo['date']): string | null {
  if (!date?.year || !date?.month || !date?.day) return null;
  const month = String(date.month).padStart(2, '0');
  const day = String(date.day).padStart(2, '0');
  return `${date.year}-${month}-${day}`;
}
