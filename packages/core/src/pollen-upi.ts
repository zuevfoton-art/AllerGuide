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

/**
 * Official Google UPI fallback colors when `indexInfo.color` is absent.
 * Do not sample colors from heatmap PNG tiles.
 */
export const POLLEN_UPI_FALLBACK_COLORS: Record<PollenUpiIndex, string> = {
  0: '#C5CAE9',
  1: '#AED581',
  2: '#FFF176',
  3: '#FFB74D',
  4: '#FF8A65',
  5: '#E53935',
};

const GOOGLE_UPI_CATEGORY_ALIASES: Record<string, PollenUpiCategory> = {
  none: 'none',
  'very low': 'very_low',
  verylow: 'very_low',
  very_low: 'very_low',
  low: 'low',
  moderate: 'moderate',
  medium: 'moderate',
  high: 'high',
  'very high': 'very_high',
  veryhigh: 'very_high',
  very_high: 'very_high',
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

/** Prefer Google's category string; fall back to the computed 0–5 bucket. */
export function pollenUpiCategoryFromLabel(
  label: string | undefined,
  index: PollenUpiIndex,
): PollenUpiCategory {
  const normalized = label?.trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (!normalized) return pollenUpiCategory(index);
  return GOOGLE_UPI_CATEGORY_ALIASES[normalized] ?? pollenUpiCategory(index);
}

export function pollenUpiFallbackColor(index: PollenUpiIndex): string {
  return POLLEN_UPI_FALLBACK_COLORS[index];
}

/** Convert Google `indexInfo.color` (0–1 RGB) to `#RRGGBB`. */
export function googleIndexColorToHex(color?: {
  red?: number;
  green?: number;
  blue?: number;
}): string | undefined {
  if (!color) return undefined;
  const channels = [color.red, color.green, color.blue];
  if (channels.some((channel) => typeof channel !== 'number' || !Number.isFinite(channel))) {
    return undefined;
  }
  const hex = channels
    .map((channel) => {
      const unit = channel! <= 1 ? channel! : channel! / 255;
      const byte = Math.round(Math.min(1, Math.max(0, unit)) * 255);
      return byte.toString(16).padStart(2, '0');
    })
    .join('');
  return `#${hex}`.toUpperCase();
}

export function pollenTierFromUpi(index: PollenUpiIndex): PollenTierLevel {
  if (index <= 2) return 'low';
  if (index === 3) return 'mid';
  return 'high';
}

export interface PollenUpiDisplay {
  index: PollenUpiIndex;
  category: PollenUpiCategory;
  categorySource: 'google' | 'computed';
  color: string;
  source: 'google' | 'open-meteo';
}

export interface PollenUpiSnapshotInput {
  index: PollenUpiIndex;
  category?: string;
  color?: string;
  source: 'google' | 'open-meteo';
}

/** Category is part of the display contract; Google label wins when present. */
export function resolvePollenUpiDisplay(snapshot: PollenUpiSnapshotInput): PollenUpiDisplay {
  const index = clampPollenUpiIndex(snapshot.index);
  const googleCategory = snapshot.category
    ? pollenUpiCategoryFromLabel(snapshot.category, index)
    : null;
  return {
    index,
    category: googleCategory ?? pollenUpiCategory(index),
    categorySource: googleCategory ? 'google' : 'computed',
    color: snapshot.color?.trim() || pollenUpiFallbackColor(index),
    source: snapshot.source,
  };
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
