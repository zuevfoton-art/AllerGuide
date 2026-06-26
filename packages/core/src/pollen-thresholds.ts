import type { OpenMeteoPollenTaxonId, PollenTaxonId } from './pollen-taxonomy';

export type PollenTierLevel = 'low' | 'mid' | 'high';

/**
 * EAACI / GA²LEN-inspired concentration tiers (grains/m³).
 * Taxon-specific cutoffs; default fallback for unlisted taxa.
 * @see clinical-accuracy-roadmap B.3
 */
export interface PollenThresholdSet {
  lowMax: number;
  midMax: number;
}

const DEFAULT_THRESHOLDS: PollenThresholdSet = { lowMax: 10, midMax: 50 };

/** Per-taxon thresholds aligned with European pollen alert literature. */
const TAXON_THRESHOLDS: Partial<Record<PollenTaxonId, PollenThresholdSet>> = {
  birch_pollen: { lowMax: 15, midMax: 80 },
  grass_pollen: { lowMax: 5, midMax: 20 },
  alder_pollen: { lowMax: 10, midMax: 50 },
  ragweed_pollen: { lowMax: 10, midMax: 30 },
  mugwort_pollen: { lowMax: 5, midMax: 15 },
  olive_pollen: { lowMax: 10, midMax: 40 },
  oak_pollen: { lowMax: 15, midMax: 80 },
  rye_pollen: { lowMax: 5, midMax: 20 },
};

export function getPollenThresholds(taxonId: PollenTaxonId | OpenMeteoPollenTaxonId): PollenThresholdSet {
  return TAXON_THRESHOLDS[taxonId] ?? DEFAULT_THRESHOLDS;
}

export function classifyPollenConcentration(
  value: number,
  taxonId: PollenTaxonId | OpenMeteoPollenTaxonId,
): PollenTierLevel {
  const { lowMax, midMax } = getPollenThresholds(taxonId);
  if (value < lowMax) return 'low';
  if (value < midMax) return 'mid';
  return 'high';
}

/** Percentile rank within a reference distribution (0–100). Used for regional calibration hooks. */
export function pollenPercentileRank(value: number, reference: number[]): number {
  if (!reference.length || !Number.isFinite(value)) return 0;
  const sorted = [...reference].filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  let below = 0;
  for (const v of sorted) {
    if (v < value) below++;
    else break;
  }
  return Math.round((below / sorted.length) * 100);
}

/** Map percentile (0–100) to tier when regional baselines are available. */
export function pollenTierFromPercentile(percentile: number): PollenTierLevel {
  if (percentile < 33) return 'low';
  if (percentile < 66) return 'mid';
  return 'high';
}
