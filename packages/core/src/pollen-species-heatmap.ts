import { isPollenMapTaxonId, type PollenMapTaxonId } from './pollen-map';
import {
  clampPollenUpiIndex,
  pollenUpiCategoryFromLabel,
  pollenUpiFallbackColor,
  type PollenUpiCategory,
  type PollenUpiIndex,
} from './pollen-upi';

/**
 * Official `heatmapTiles` map types only. Species codes such as BIRCH_UPI
 * are rejected by Google and must never be requested as tile types.
 */
export const POLLEN_SPECIES_HEATMAP_OFFICIAL_MAP_TYPES = [
  'TREE_UPI',
  'GRASS_UPI',
  'WEED_UPI',
] as const;

/** Google forecast resolution used for a derived species grid. */
export const POLLEN_SPECIES_SAMPLE_RESOLUTION_KM = 1;
/** Hard cap so a city pan cannot fan out into hundreds of forecast:lookup calls. */
export const POLLEN_SPECIES_SAMPLE_MAX_POINTS = 25;
/** Reject viewports larger than this diagonal to avoid sparse, misleading grids. */
export const POLLEN_SPECIES_SAMPLE_MAX_SPAN_KM = 40;
export const POLLEN_SPECIES_SAMPLE_MIN_ZOOM = 10;
export const POLLEN_SPECIES_SAMPLE_MAX_ZOOM = 16;
export const POLLEN_SPECIES_SAMPLE_MAX_DAY_OFFSET = 4;
/** Conservative public list price used only for spike cost estimates. */
export const POLLEN_SPECIES_FORECAST_USD_PER_CALL = 0.01;
const KILOMETERS_PER_LATITUDE_DEGREE = 111.32;
const MIN_LONGITUDE_SCALE = 0.2;

/**
 * Product decision after the quota / ToS / UX spike.
 *
 * No-go: official tiles have no plant code, a 1 km city grid needs hundreds of
 * forecast:lookup calls per idle, coverage is seasonal (max 15 plants / point),
 * and interpolating missing cells would overstate precision. Keep TREE/GRASS/WEED
 * tiles and show species UPI on the point card instead.
 */
export const POLLEN_SPECIES_HEATMAP_PRODUCT_DECISION = 'no-go' as const;

export type PollenSpeciesHeatmapDecision = 'go' | 'no-go';

export interface SpeciesHeatmapViewport {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface SpeciesSamplePoint {
  lat: number;
  lon: number;
}

export interface SpeciesHeatmapSample {
  lat: number;
  lon: number;
  upi: PollenUpiIndex | null;
  category: PollenUpiCategory | null;
  color: string | null;
  hasData: boolean;
}

export interface SpeciesSampleGridResult {
  points: SpeciesSamplePoint[];
  resolutionKm: number;
  unclippedCount: number;
  clipped: boolean;
  spanKm: number;
}

export interface SpeciesHeatmapQuotaEstimate {
  forecastCalls: number;
  estimatedUsd: number;
  exceedsStageBudget: boolean;
}

export function isSpeciesHeatmapViewport(value: {
  north?: number;
  south?: number;
  east?: number;
  west?: number;
}): value is SpeciesHeatmapViewport {
  const { north, south, east, west } = value;
  if (
    typeof north !== 'number' ||
    typeof south !== 'number' ||
    typeof east !== 'number' ||
    typeof west !== 'number'
  ) {
    return false;
  }
  if (![north, south, east, west].every(Number.isFinite)) return false;
  if (north <= south) return false;
  if (Math.abs(north) > 90 || Math.abs(south) > 90) return false;
  if (Math.abs(east) > 180 || Math.abs(west) > 180) return false;
  return true;
}

export function parseSpeciesHeatmapTaxon(raw: string): PollenMapTaxonId | null {
  return isPollenMapTaxonId(raw) ? raw : null;
}

export function viewportSpanKm(viewport: SpeciesHeatmapViewport): number {
  const latitudeKm = Math.abs(viewport.north - viewport.south) * KILOMETERS_PER_LATITUDE_DEGREE;
  const midLatitude = (viewport.north + viewport.south) / 2;
  const longitudeScale = Math.max(
    Math.cos((midLatitude * Math.PI) / 180),
    MIN_LONGITUDE_SCALE,
  );
  const longitudeKm =
    Math.abs(viewport.east - viewport.west) * KILOMETERS_PER_LATITUDE_DEGREE * longitudeScale;
  return Math.hypot(latitudeKm, longitudeKm);
}

/**
 * Build a 1 km-aligned sample grid, then clip to the hard point cap.
 * Callers must not interpolate missing species UPI from TREE/GRASS/WEED.
 */
export function buildSpeciesSampleGrid(
  viewport: SpeciesHeatmapViewport,
  resolutionKm = POLLEN_SPECIES_SAMPLE_RESOLUTION_KM,
  maxPoints = POLLEN_SPECIES_SAMPLE_MAX_POINTS,
): SpeciesSampleGridResult {
  const spanKm = viewportSpanKm(viewport);
  const midLatitude = (viewport.north + viewport.south) / 2;
  const longitudeScale = Math.max(
    Math.cos((midLatitude * Math.PI) / 180),
    MIN_LONGITUDE_SCALE,
  );
  const latitudeStep = resolutionKm / KILOMETERS_PER_LATITUDE_DEGREE;
  const longitudeStep = resolutionKm / (KILOMETERS_PER_LATITUDE_DEGREE * longitudeScale);

  const rawPoints: SpeciesSamplePoint[] = [];
  for (let lat = viewport.south + latitudeStep / 2; lat < viewport.north; lat += latitudeStep) {
    for (let lon = viewport.west + longitudeStep / 2; lon < viewport.east; lon += longitudeStep) {
      rawPoints.push({
        lat: Number(lat.toFixed(5)),
        lon: Number(lon.toFixed(5)),
      });
    }
  }

  if (rawPoints.length === 0) {
    rawPoints.push({
      lat: Number(midLatitude.toFixed(5)),
      lon: Number(((viewport.east + viewport.west) / 2).toFixed(5)),
    });
  }

  const clipped = rawPoints.length > maxPoints;
  const points = clipped ? downsamplePoints(rawPoints, maxPoints) : rawPoints;

  return {
    points,
    resolutionKm,
    unclippedCount: rawPoints.length,
    clipped,
    spanKm: Number(spanKm.toFixed(1)),
  };
}

export function estimateSpeciesHeatmapQuota(
  sampleCount: number,
  idleUpdatesPerSession = 8,
): SpeciesHeatmapQuotaEstimate {
  const forecastCalls = Math.max(0, sampleCount) * Math.max(1, idleUpdatesPerSession);
  const estimatedUsd = Number((forecastCalls * POLLEN_SPECIES_FORECAST_USD_PER_CALL).toFixed(2));
  return {
    forecastCalls,
    estimatedUsd,
    exceedsStageBudget: forecastCalls > POLLEN_SPECIES_SAMPLE_MAX_POINTS * 4,
  };
}

export function evaluateSpeciesHeatmapGoNoGo(input: {
  unclippedCitySamples: number;
  clippedSamples: number;
  coverageRatio: number;
  usesOfficialPlantTiles: boolean;
}): { decision: PollenSpeciesHeatmapDecision; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.usesOfficialPlantTiles) {
    reasons.push('Google heatmapTiles accept only TREE_UPI / GRASS_UPI / WEED_UPI');
  }
  if (input.unclippedCitySamples > 100) {
    reasons.push(
      `1 km city viewport needs ${input.unclippedCitySamples} forecast:lookup calls per idle`,
    );
  }
  if (input.clippedSamples > 16) {
    reasons.push('Even a clipped grid stays too expensive for staging quota');
  }
  if (input.coverageRatio < 0.5) {
    reasons.push('Species coverage is seasonal and at most 15 plants per point');
  }
  reasons.push('Interpolating empty cells would overstate 1 km precision');

  return {
    decision: POLLEN_SPECIES_HEATMAP_PRODUCT_DECISION,
    reasons,
  };
}

export function speciesSampleFromPlantUpi(input: {
  lat: number;
  lon: number;
  index?: number;
  category?: string;
  color?: string;
}): SpeciesHeatmapSample {
  if (typeof input.index !== 'number' || !Number.isFinite(input.index)) {
    return {
      lat: input.lat,
      lon: input.lon,
      upi: null,
      category: null,
      color: null,
      hasData: false,
    };
  }

  const upi = clampPollenUpiIndex(input.index);
  return {
    lat: input.lat,
    lon: input.lon,
    upi,
    category: pollenUpiCategoryFromLabel(input.category, upi),
    color: input.color?.trim() || pollenUpiFallbackColor(upi),
    hasData: true,
  };
}

function downsamplePoints(points: SpeciesSamplePoint[], maxPoints: number): SpeciesSamplePoint[] {
  if (points.length <= maxPoints) return points;
  const step = points.length / maxPoints;
  const picked: SpeciesSamplePoint[] = [];
  for (let index = 0; index < maxPoints; index += 1) {
    picked.push(points[Math.min(points.length - 1, Math.floor(index * step))]!);
  }
  return picked;
}
