import { getCrossReactionsFor } from './cross-reactions';
import { getPollenTaxon, type OpenMeteoPollenTaxonId } from './pollen-taxonomy';
import type { PollenMapTaxonId } from './pollen-map';

/** Google Pollen API plant codes we map onto Open-Meteo taxa. */
export const GOOGLE_PLANT_CODE_TO_TAXON: Record<string, PollenMapTaxonId> = {
  BIRCH: 'birch_pollen',
  ALDER: 'alder_pollen',
  OLIVE: 'olive_pollen',
  GRASS: 'grass_pollen',
  GRAMINALES: 'grass_pollen',
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
}

export function googlePlantCodeToTaxon(code: string): PollenMapTaxonId | null {
  return GOOGLE_PLANT_CODE_TO_TAXON[code.trim().toUpperCase()] ?? null;
}

/**
 * Build plant education card from core taxonomy + cross-reactions,
 * optionally enriched with Google `plantDescription` fields.
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
  },
): PollenPlantDetail {
  const taxon = getPollenTaxon(taxonId);
  const allergenId = taxon?.allergenId ?? null;
  const matches = allergenId ? getCrossReactionsFor(allergenId) : [];

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
  };
}
