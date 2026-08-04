import {
  clampPollenUpiIndex,
  interpolateUpiAt,
  parseHourlyTimestamp,
  pollenUpiFromConcentration,
  POLLEN_MAP_TAXON_IDS,
  type HourlySample,
  type PollenMapTaxonId,
  type PollenUpiIndex,
} from '@allerguide/core';
import { logCaughtError } from '@/src/services/error-reporting';

export type PollenHourlySeries = Partial<Record<PollenMapTaxonId, HourlySample<number>[]>>;

/**
 * Secondary hourly pollen grains→UPI series from Open-Meteo for plume near-real-time.
 * Does not replace Google/OM daily readings on the Map status card.
 */
export async function fetchPollenHourlySeries(
  latitude: number,
  longitude: number,
): Promise<PollenHourlySeries | null> {
  try {
    const taxa = POLLEN_MAP_TAXON_IDS.join(',');
    const url =
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}` +
      `&longitude=${longitude}&timezone=auto&forecast_days=2&hourly=${taxa}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Open-Meteo pollen hourly HTTP ${response.status}`);

    const payload = (await response.json()) as {
      hourly?: Record<string, (number | null)[] | string[] | undefined>;
    };
    const times = (payload.hourly?.time as string[] | undefined) ?? [];
    const series: PollenHourlySeries = {};

    for (const taxonId of POLLEN_MAP_TAXON_IDS) {
      const values = payload.hourly?.[taxonId] as (number | null)[] | undefined;
      if (!values) continue;
      const samples: HourlySample<number>[] = [];
      for (let i = 0; i < times.length; i += 1) {
        const atMs = parseHourlyTimestamp(times[i] ?? '');
        const grains = values[i];
        if (atMs == null || typeof grains !== 'number' || !Number.isFinite(grains)) continue;
        samples.push({
          atMs,
          value: pollenUpiFromConcentration(grains, taxonId),
        });
      }
      if (samples.length > 0) series[taxonId] = samples;
    }

    return Object.keys(series).length > 0 ? series : null;
  } catch (error) {
    logCaughtError('fetchPollenHourlySeries', error, { level: 'warn' });
    return null;
  }
}

export function resolveHourlyUpi(
  series: PollenHourlySeries | null | undefined,
  taxonId: PollenMapTaxonId,
  atMs: number = Date.now(),
): PollenUpiIndex | null {
  const samples = series?.[taxonId];
  if (!samples?.length) return null;
  const value = interpolateUpiAt(samples, atMs);
  if (value == null) return null;
  return clampPollenUpiIndex(value);
}
