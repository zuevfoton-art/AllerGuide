import { POLLEN_TYPE_GROUP_BY_TAXON, type PollenMapTaxonId } from './pollen-map';

export const GOOGLE_POLLEN_MAP_TYPES = ['TREE_UPI', 'GRASS_UPI', 'WEED_UPI'] as const;

export type GooglePollenMapType = (typeof GOOGLE_POLLEN_MAP_TYPES)[number];

export const GOOGLE_POLLEN_HEATMAP_MIN_ZOOM = 0;
export const GOOGLE_POLLEN_HEATMAP_MAX_ZOOM = 16;

export interface PollenHeatmapTileCoordinates {
  zoom: number;
  x: number;
  y: number;
}

export function pollenTaxonToGoogleMapType(
  taxonId: PollenMapTaxonId,
): GooglePollenMapType {
  return `${POLLEN_TYPE_GROUP_BY_TAXON[taxonId]}_UPI`;
}

export function isGooglePollenMapType(value: string): value is GooglePollenMapType {
  return (GOOGLE_POLLEN_MAP_TYPES as readonly string[]).includes(value);
}

export function parsePollenHeatmapTileCoordinates(
  rawZoom: string,
  rawX: string,
  rawY: string,
): PollenHeatmapTileCoordinates | null {
  const zoom = Number(rawZoom);
  const x = Number(rawX);
  const y = Number(rawY);

  if (![zoom, x, y].every(Number.isInteger)) return null;
  if (zoom < GOOGLE_POLLEN_HEATMAP_MIN_ZOOM || zoom > GOOGLE_POLLEN_HEATMAP_MAX_ZOOM) {
    return null;
  }

  const maximumTileIndex = 2 ** zoom - 1;
  if (x < 0 || x > maximumTileIndex || y < 0 || y > maximumTileIndex) return null;

  return { zoom, x, y };
}
