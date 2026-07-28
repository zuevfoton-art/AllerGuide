import type { GooglePollenMapType } from '@allerguide/core';

const GOOGLE_POLLEN_API_BASE_URL = 'https://pollen.googleapis.com/v1';

export function isGooglePollenHeatmapConfigured(): boolean {
  return (
    process.env.POLLEN_HEATMAP_ENABLED === 'true' &&
    Boolean(process.env.GOOGLE_POLLEN_API_KEY?.trim())
  );
}

export function buildGooglePollenHeatmapUrl(
  mapType: GooglePollenMapType,
  zoom: number,
  x: number,
  y: number,
): string {
  const apiKey = process.env.GOOGLE_POLLEN_API_KEY?.trim();
  if (!apiKey) throw new Error('GOOGLE_POLLEN_API_KEY is not configured');

  return (
    `${GOOGLE_POLLEN_API_BASE_URL}/mapTypes/${mapType}` +
    `/heatmapTiles/${zoom}/${x}/${y}?key=${encodeURIComponent(apiKey)}`
  );
}

export async function fetchGooglePollenHeatmapTile(
  mapType: GooglePollenMapType,
  zoom: number,
  x: number,
  y: number,
): Promise<Response> {
  return fetch(buildGooglePollenHeatmapUrl(mapType, zoom, x, y), {
    headers: { Accept: 'image/png' },
  });
}
