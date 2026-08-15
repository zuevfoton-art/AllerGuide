import {
  buildSpeciesSampleGrid,
  isPollenMapTaxonId,
  isSpeciesHeatmapViewport,
  POLLEN_SPECIES_SAMPLE_MAX_DAY_OFFSET,
  POLLEN_SPECIES_SAMPLE_MAX_SPAN_KM,
  POLLEN_SPECIES_SAMPLE_MAX_ZOOM,
  POLLEN_SPECIES_SAMPLE_MIN_ZOOM,
  speciesSampleFromPlantUpi,
  type PollenMapTaxonId,
  type SpeciesHeatmapSample,
  type SpeciesHeatmapViewport,
} from '@allerguide/core';
import {
  fetchGooglePollenForecast,
  isGooglePollenForecastConfigured,
  peekGooglePollenForecastCacheSize,
} from './google-pollen-forecast';

const SAMPLE_CONCURRENCY = 4;
const SAMPLE_TIMEOUT_MS = 8000;

export interface SpeciesSamplesResult {
  taxonId: PollenMapTaxonId;
  dayOffset: number;
  resolutionKm: number;
  spanKm: number;
  clipped: boolean;
  unclippedCount: number;
  samples: SpeciesHeatmapSample[];
  telemetry: {
    forecastCalls: number;
    cacheHits: number;
    withData: number;
    withoutData: number;
    elapsedMs: number;
  };
}

export function isPollenSpeciesHeatmapConfigured(): boolean {
  return process.env.POLLEN_SPECIES_HEATMAP_ENABLED === 'true' && isGooglePollenForecastConfigured();
}

export async function fetchPollenSpeciesSamples(input: {
  viewport: SpeciesHeatmapViewport;
  zoom: number;
  taxonId: PollenMapTaxonId;
  dayOffset: number;
}): Promise<SpeciesSamplesResult> {
  const started = Date.now();
  const cacheSizeBefore = peekGooglePollenForecastCacheSize();
  const grid = buildSpeciesSampleGrid(input.viewport);
  const dayOffset = Math.min(
    POLLEN_SPECIES_SAMPLE_MAX_DAY_OFFSET,
    Math.max(0, Math.trunc(input.dayOffset)),
  );

  const samples = await mapWithConcurrency(grid.points, SAMPLE_CONCURRENCY, async (point) => {
    const forecast = await fetchGooglePollenForecast(point.lat, point.lon);
    const day = forecast.days[dayOffset] ?? forecast.days[0];
    const plantUpi = day?.plantIndexes?.[input.taxonId];
    return speciesSampleFromPlantUpi({
      lat: point.lat,
      lon: point.lon,
      index: plantUpi?.index,
      category: plantUpi?.category,
      color: plantUpi?.color,
    });
  });

  const withData = samples.filter((sample) => sample.hasData).length;
  const cacheSizeAfter = peekGooglePollenForecastCacheSize();
  const cacheHits = Math.max(0, samples.length - Math.max(0, cacheSizeAfter - cacheSizeBefore));

  return {
    taxonId: input.taxonId,
    dayOffset,
    resolutionKm: grid.resolutionKm,
    spanKm: grid.spanKm,
    clipped: grid.clipped,
    unclippedCount: grid.unclippedCount,
    samples,
    telemetry: {
      forecastCalls: samples.length,
      cacheHits,
      withData,
      withoutData: samples.length - withData,
      elapsedMs: Date.now() - started,
    },
  };
}

export function parseSpeciesSamplesQuery(query: RequestQuery):
  | { ok: true; viewport: SpeciesHeatmapViewport; zoom: number; taxonId: PollenMapTaxonId; dayOffset: number }
  | { ok: false; error: string } {
  const viewport = {
    north: parseNumber(query.north),
    south: parseNumber(query.south),
    east: parseNumber(query.east),
    west: parseNumber(query.west),
  };
  if (!isSpeciesHeatmapViewport(viewport)) {
    return { ok: false, error: 'north, south, east and west are required' };
  }
  if (viewport.north - viewport.south > 2 || Math.abs(viewport.east - viewport.west) > 2) {
    return { ok: false, error: 'Viewport is too large' };
  }

  const zoom = parseNumber(query.zoom);
  if (
    zoom === undefined ||
    zoom < POLLEN_SPECIES_SAMPLE_MIN_ZOOM ||
    zoom > POLLEN_SPECIES_SAMPLE_MAX_ZOOM
  ) {
    return { ok: false, error: 'zoom must be between 10 and 16' };
  }

  const taxonRaw = typeof query.taxon === 'string' ? query.taxon : '';
  if (!isPollenMapTaxonId(taxonRaw)) {
    return { ok: false, error: 'Invalid pollen taxon' };
  }

  const dayOffset = parseNumber(query.day) ?? 0;
  if (dayOffset < 0 || dayOffset > POLLEN_SPECIES_SAMPLE_MAX_DAY_OFFSET) {
    return { ok: false, error: 'day must be between 0 and 4' };
  }

  const spanCheck = buildSpeciesSampleGrid(viewport);
  if (spanCheck.spanKm > POLLEN_SPECIES_SAMPLE_MAX_SPAN_KM) {
    return { ok: false, error: 'Viewport span exceeds the species-sample limit' };
  }

  return {
    ok: true,
    viewport,
    zoom,
    taxonId: taxonRaw,
    dayOffset,
  };
}

type RequestQuery = Record<string, unknown>;

function parseNumber(raw: unknown): number | undefined {
  if (typeof raw !== 'string' && typeof raw !== 'number') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
  }, SAMPLE_TIMEOUT_MS);

  try {
    async function worker(): Promise<void> {
      while (nextIndex < items.length) {
        if (timedOut) throw new Error('Species sample timeout');
        const current = nextIndex;
        nextIndex += 1;
        results[current] = await mapper(items[current]!);
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
    );
    return results;
  } finally {
    clearTimeout(timer);
  }
}
