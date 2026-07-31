import { getPollenThresholds, type PollenTierLevel } from './pollen-thresholds';
import type { OpenMeteoPollenTaxonId, PollenTaxonId } from './pollen-taxonomy';

/**
 * Universal Pollen Index (UPI) as used by Google Pollen API: 0–5.
 * 0 = none, 1 = very low … 5 = very high.
 */
export type PollenUpiIndex = 0 | 1 | 2 | 3 | 4 | 5;

export const POLLEN_UPI_MAX = 5;

export type PollenUpiCategory =
  | 'none'
  | 'very_low'
  | 'low'
  | 'moderate'
  | 'high'
  | 'very_high';

const UPI_CATEGORY_BY_INDEX: Record<PollenUpiIndex, PollenUpiCategory> = {
  0: 'none',
  1: 'very_low',
  2: 'low',
  3: 'moderate',
  4: 'high',
  5: 'very_high',
};

/** Clamp a raw Google `indexInfo.value` into the UPI range. */
export function clampPollenUpiIndex(value: number): PollenUpiIndex {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.round(value);
  if (rounded <= 0) return 0;
  if (rounded >= POLLEN_UPI_MAX) return 5;
  return rounded as PollenUpiIndex;
}

export function pollenUpiCategory(index: PollenUpiIndex): PollenUpiCategory {
  return UPI_CATEGORY_BY_INDEX[index];
}

export function pollenTierFromUpi(index: PollenUpiIndex): PollenTierLevel {
  if (index <= 2) return 'low';
  if (index === 3) return 'mid';
  return 'high';
}

/**
 * Approximate UPI from Open-Meteo grains/m³ when Google Forecast is unavailable.
 * Uses taxon thresholds: below lowMax → 1–2, below midMax → 3, above → 4–5.
 */
export function pollenUpiFromConcentration(
  value: number,
  taxonId: PollenTaxonId | OpenMeteoPollenTaxonId,
): PollenUpiIndex {
  if (!Number.isFinite(value) || value <= 0) return 0;

  const { lowMax, midMax } = getPollenThresholds(taxonId);
  if (value < lowMax * 0.5) return 1;
  if (value < lowMax) return 2;
  if (value < midMax) return 3;
  if (value < midMax * 2) return 4;
  return 5;
}
