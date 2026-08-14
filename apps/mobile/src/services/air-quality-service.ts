import type { AirQualitySnapshot, GoogleAirQualityMapType } from '@allerguide/core';
import { AIR_QUALITY_GOOGLE_ENABLED } from '@/src/constants/features';
import { apiRequest, getApiBaseUrl } from '@/src/services/api-client';
import { logCaughtError } from '@/src/services/error-reporting';

const DEFAULT_AIR_QUALITY_HEATMAP_TYPE: GoogleAirQualityMapType = 'UAQI_INDIGO_PERSIAN';

export function isGoogleAirQualityAvailable(): boolean {
  return AIR_QUALITY_GOOGLE_ENABLED && Boolean(getApiBaseUrl().trim());
}

export function isAirQualityHeatmapAvailable(): boolean {
  return (
    isGoogleAirQualityAvailable() &&
    Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim())
  );
}

/** Google air quality via the API proxy; null when disabled or unreachable. */
export async function fetchAirQualitySnapshot(
  latitude: number,
  longitude: number,
  languageCode = 'ru',
): Promise<AirQualitySnapshot | null> {
  if (!isGoogleAirQualityAvailable()) return null;

  try {
    const response = await apiRequest<{ ok?: boolean; airQuality?: AirQualitySnapshot }>(
      `/api/air-quality/current?lat=${latitude}&lon=${longitude}&lang=${languageCode}`,
    );
    if (!response.ok || !response.data.airQuality) return null;
    return response.data.airQuality;
  } catch (error) {
    logCaughtError('fetchAirQualitySnapshot', error, { level: 'warn' });
    return null;
  }
}

export function buildAirQualityHeatmapTileUrlTemplate(
  mapType: GoogleAirQualityMapType = DEFAULT_AIR_QUALITY_HEATMAP_TYPE,
  apiBaseUrl = getApiBaseUrl(),
): string {
  const normalizedApiBaseUrl = apiBaseUrl.trim().replace(/\/+$/, '');
  if (!normalizedApiBaseUrl) throw new Error('EXPO_PUBLIC_API_URL is not configured');

  return `${normalizedApiBaseUrl}/api/air-quality/heatmap/${mapType}/{z}/{x}/{y}`;
}
