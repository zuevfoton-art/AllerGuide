import { getCrossReactionsFor } from './cross-reactions';
import { getPollenTaxon, type OpenMeteoPollenTaxonId } from './pollen-taxonomy';
import type { PollenMapTaxonId } from './pollen-map';

/**
 * All plant codes documented by the Google Pollen API (Pollen Index page).
 * COTTONWOOD is the Populus genus, so it maps onto our poplar taxon.
 */
export const GOOGLE_POLLEN_PLANT_CODES = [
  'ALDER',
  'ASH',
  'BIRCH',
  'COTTONWOOD',
  'ELM',
  'MAPLE',
  'OLIVE',
  'JUNIPER',
  'OAK',
  'PINE',
  'CYPRESS_PINE',
  'HAZEL',
  'GRAMINALES',
  'JAPANESE_CEDAR',
  'JAPANESE_CYPRESS',
  'RAGWEED',
  'MUGWORT',
] as const;

export type GooglePollenPlantCode = (typeof GOOGLE_POLLEN_PLANT_CODES)[number];

/** Google Pollen API plant codes mapped onto canonical pollen taxa. */
export const GOOGLE_PLANT_CODE_TO_TAXON: Record<string, PollenMapTaxonId> = {
  ALDER: 'alder_pollen',
  ASH: 'ash_pollen',
  BIRCH: 'birch_pollen',
  COTTONWOOD: 'poplar_pollen',
  ELM: 'elm_pollen',
  MAPLE: 'maple_pollen',
  OLIVE: 'olive_pollen',
  JUNIPER: 'juniper_pollen',
  OAK: 'oak_pollen',
  PINE: 'pine_pollen',
  CYPRESS_PINE: 'cypress_pine_pollen',
  HAZEL: 'hazel_pollen',
  // GRASS is not in Google's documented plant enum but appears in practice.
  GRASS: 'grass_pollen',
  GRAMINALES: 'grass_pollen',
  JAPANESE_CEDAR: 'japanese_cedar_pollen',
  JAPANESE_CYPRESS: 'japanese_cypress_pollen',
  RAGWEED: 'ragweed_pollen',
  MUGWORT: 'mugwort_pollen',
};

export interface PollenPlantDetail {
  taxonId: PollenMapTaxonId;
  displayName: string;
  family?: string;
  season?: string;
  specialColors?: string;
  specialShapes?: string;
  pictureUrl?: string;
  /** Free-text cross-reaction note from Google plantDescription when present. */
  crossReactionNote?: string;
  /** Canonical allergen ids from `@allerguide/core` cross-reaction graph. */
  crossReactionAllergenIds: string[];
  crossReactionLabels: string[];
  /** Google `inSeason` for the current forecast day, when provided. */
  inSeason?: boolean;
  /** Google `indexInfo.indexDescription` — keep as source text, do not localize here. */
  indexDescription?: string;
  /** Hex color from Google `indexInfo.color` or official UPI fallback. */
  indexColor?: string;
  /** Google plant/type health recommendations for the selected day. */
  healthRecommendations?: string[];
}

export function googlePlantCodeToTaxon(code: string): PollenMapTaxonId | null {
  return GOOGLE_PLANT_CODE_TO_TAXON[code.trim().toUpperCase()] ?? null;
}

/**
 * Build plant education card from core taxonomy + cross-reactions,
 * optionally enriched with Google `plantDescription` and index fields.
 */
export function buildPollenPlantDetail(
  taxonId: PollenMapTaxonId | OpenMeteoPollenTaxonId,
  google?: {
    displayName?: string;
    family?: string;
    season?: string;
    specialColors?: string;
    specialShapes?: string;
    picture?: string;
    crossReaction?: string;
    inSeason?: boolean;
    indexDescription?: string;
    indexColor?: string;
    healthRecommendations?: string[];
  },
): PollenPlantDetail {
  const taxon = getPollenTaxon(taxonId);
  const allergenId = taxon?.allergenId ?? null;
  const matches = allergenId ? getCrossReactionsFor(allergenId) : [];
  const recommendations = (google?.healthRecommendations ?? [])
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    taxonId: taxonId as PollenMapTaxonId,
    displayName: google?.displayName?.trim() || taxon?.labelRu || taxonId,
    family: google?.family?.trim() || undefined,
    season: google?.season?.trim() || undefined,
    specialColors: google?.specialColors?.trim() || undefined,
    specialShapes: google?.specialShapes?.trim() || undefined,
    pictureUrl: google?.picture?.trim() || undefined,
    crossReactionNote: google?.crossReaction?.trim() || undefined,
    crossReactionAllergenIds: matches.map((match) => match.allergen.id),
    crossReactionLabels: matches.map((match) => match.allergen.name),
    inSeason: typeof google?.inSeason === 'boolean' ? google.inSeason : undefined,
    indexDescription: google?.indexDescription?.trim() || undefined,
    indexColor: google?.indexColor?.trim() || undefined,
    healthRecommendations: recommendations.length > 0 ? recommendations : undefined,
  };
}
