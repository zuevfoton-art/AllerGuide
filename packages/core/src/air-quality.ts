/**
 * Google Air Quality API normalization.
 * @see https://developers.google.com/maps/documentation/air-quality
 */

export type AirQualityRiskLevel = 'low' | 'mid' | 'high';

export interface AirQualityIndexSnapshot {
  /** Index code, e.g. `uaqi` or a local index like `rus_mecoenr`. */
  code: string;
  displayName?: string;
  aqi: number;
  category?: string;
  dominantPollutant?: string;
}

export interface AirQualityPollutantSnapshot {
  code: string;
  displayName?: string;
  fullName?: string;
  value: number | null;
  units?: string;
}

export interface AirQualitySnapshot {
  dateTime: string | null;
  regionCode: string | null;
  /** Universal AQI (0–100, higher = cleaner air). */
  universal: AirQualityIndexSnapshot | null;
  /** Local AQI when the API returns one for the region. */
  local: AirQualityIndexSnapshot | null;
  pollutants: AirQualityPollutantSnapshot[];
  healthRecommendations: {
    general?: string;
    sensitive?: string;
  } | null;
}

/** Google Air Quality heatmap tile types we proxy. */
export const GOOGLE_AIR_QUALITY_MAP_TYPES = [
  'UAQI_RED_GREEN',
  'UAQI_INDIGO_PERSIAN',
  'US_AQI',
] as const;

export type GoogleAirQualityMapType = (typeof GOOGLE_AIR_QUALITY_MAP_TYPES)[number];

export function isGoogleAirQualityMapType(
  value: string,
): value is GoogleAirQualityMapType {
  return (GOOGLE_AIR_QUALITY_MAP_TYPES as readonly string[]).includes(value);
}

/**
 * Risk tier from Universal AQI. UAQI is inverted vs. pollutant AQIs:
 * 100 is excellent air, 0 is the worst.
 */
export function airQualityRiskFromUaqi(uaqi: number | null | undefined): AirQualityRiskLevel {
  if (typeof uaqi !== 'number' || !Number.isFinite(uaqi)) return 'mid';
  if (uaqi >= 60) return 'low';
  if (uaqi >= 40) return 'mid';
  return 'high';
}

interface GoogleAirQualityIndexPayload {
  code?: string;
  displayName?: string;
  aqi?: number;
  aqiDisplay?: string;
  category?: string;
  dominantPollutant?: string;
}

export interface GoogleAirQualityCurrentPayload {
  dateTime?: string;
  regionCode?: string;
  indexes?: GoogleAirQualityIndexPayload[];
  pollutants?: Array<{
    code?: string;
    displayName?: string;
    fullName?: string;
    concentration?: { value?: number; units?: string };
  }>;
  healthRecommendations?: {
    generalPopulation?: string;
    lungDiseasePopulation?: string;
    children?: string;
    elderly?: string;
  };
}

function normalizeIndex(
  index: GoogleAirQualityIndexPayload | undefined,
): AirQualityIndexSnapshot | null {
  if (!index?.code || typeof index.aqi !== 'number') return null;
  return {
    code: index.code,
    displayName: index.displayName?.trim() || undefined,
    aqi: index.aqi,
    category: index.category?.trim() || undefined,
    dominantPollutant: index.dominantPollutant?.trim() || undefined,
  };
}

export function normalizeGoogleAirQuality(
  payload: GoogleAirQualityCurrentPayload,
): AirQualitySnapshot {
  const indexes = payload.indexes ?? [];
  const universal = normalizeIndex(indexes.find((index) => index.code === 'uaqi'));
  const local = normalizeIndex(indexes.find((index) => index.code && index.code !== 'uaqi'));

  const pollutants = (payload.pollutants ?? []).flatMap((pollutant) => {
    if (!pollutant.code) return [];
    return [
      {
        code: pollutant.code,
        displayName: pollutant.displayName?.trim() || undefined,
        fullName: pollutant.fullName?.trim() || undefined,
        value:
          typeof pollutant.concentration?.value === 'number'
            ? pollutant.concentration.value
            : null,
        units: pollutant.concentration?.units,
      },
    ];
  });

  const general = payload.healthRecommendations?.generalPopulation?.trim();
  const sensitive =
    payload.healthRecommendations?.lungDiseasePopulation?.trim() ||
    payload.healthRecommendations?.children?.trim() ||
    payload.healthRecommendations?.elderly?.trim();

  return {
    dateTime: payload.dateTime ?? null,
    regionCode: payload.regionCode ?? null,
    universal,
    local,
    pollutants,
    healthRecommendations:
      general || sensitive
        ? {
            ...(general ? { general } : {}),
            ...(sensitive ? { sensitive } : {}),
          }
        : null,
  };
}
