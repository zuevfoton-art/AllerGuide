import type { GooglePollenMapType } from '@allerguide/core';
import { GOOGLE_POLLEN_HEATMAP_ENABLED } from '@/src/constants/features';
import { getApiBaseUrl } from '@/src/services/api-client';

export function isGooglePollenHeatmapAvailable(): boolean {
  return (
    GOOGLE_POLLEN_HEATMAP_ENABLED &&
    Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()) &&
    Boolean(getApiBaseUrl().trim())
  );
}

export function buildPollenHeatmapTileUrlTemplate(
  mapType: GooglePollenMapType,
  apiBaseUrl = getApiBaseUrl(),
): string {
  const normalizedApiBaseUrl = apiBaseUrl.trim().replace(/\/+$/, '');
  if (!normalizedApiBaseUrl) throw new Error('EXPO_PUBLIC_API_URL is not configured');

  return (
    `${normalizedApiBaseUrl}/api/pollen/heatmap/${mapType}` +
    '/{z}/{x}/{y}'
  );
}

export function resolvePollenHeatmapTileUrl(
  template: string,
  zoom: number,
  x: number,
  y: number,
): string {
  const tileCount = 2 ** zoom;
  const wrappedX = ((x % tileCount) + tileCount) % tileCount;

  return template
    .replace('{z}', String(zoom))
    .replace('{x}', String(wrappedX))
    .replace('{y}', String(y));
}
