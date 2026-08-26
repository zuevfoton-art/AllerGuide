import { pollenTaxonToGoogleMapType, type GooglePollenMapType } from './google-pollen-heatmap';
import {
  POLLEN_MAP_TAXON_IDS,
  POLLEN_TYPE_GROUP_BY_TAXON,
  readingToUpiSnapshot,
  type PollenForecastDay,
  type PollenMapReading,
  type PollenMapTaxonId,
  type PollenUpiSnapshot,
} from './pollen-map';
import { getPollenTaxon, profileMatchesPollenTaxon } from './pollen-taxonomy';
import type { ProfileAllergenId } from './profile-allergens';
import { pollenTierFromUpi, type PollenUpiIndex } from './pollen-upi';

export type GooglePollenTypeKey = 'TREE' | 'GRASS' | 'WEED';

/**
 * Tree species share Google heatmap `TREE_UPI` but must use plant-level
 * Forecast indexes (BIRCH/OAK/…) — never the aggregated TREE type UPI,
 * which would make every tree species look identical.
 */
export const TREE_SPECIES_POLLEN_TAXON_IDS = POLLEN_MAP_TAXON_IDS.filter(
  (taxonId) => POLLEN_TYPE_GROUP_BY_TAXON[taxonId] === 'TREE',
);

export type TreeSpeciesPollenTaxonId = (typeof TREE_SPECIES_POLLEN_TAXON_IDS)[number];

/** Minimal day shape shared by API proxy and mobile client. */
export interface GoogleForecastDayInput {
  date: string;
  typeIndexes?: Partial<Record<GooglePollenTypeKey, PollenUpiSnapshot>>;
  plantIndexes?: Partial<Record<PollenMapTaxonId, PollenUpiSnapshot>>;
}

export function isTreeSpeciesPollenTaxon(
  taxonId: PollenMapTaxonId,
): taxonId is TreeSpeciesPollenTaxonId {
  return (TREE_SPECIES_POLLEN_TAXON_IDS as readonly string[]).includes(taxonId);
}

export function googleTypeKeyForTaxon(taxonId: PollenMapTaxonId): GooglePollenTypeKey {
  return POLLEN_TYPE_GROUP_BY_TAXON[taxonId];
}

/**
 * Official heatmapTiles follow TREE/GRASS/WEED type indexes, not plant codes.
 * Missing or zero type UPI means the group overlay is empty (off-season).
 */
export function hasGoogleGroupHeatmap(
  taxonId: PollenMapTaxonId,
  typeIndexes?: Partial<Record<GooglePollenTypeKey, PollenUpiSnapshot>> | null,
): boolean {
  const typeUpi = typeIndexes?.[googleTypeKeyForTaxon(taxonId)];
  return Boolean(typeUpi && typeUpi.index > 0);
}

/** Official heatmapTiles only when the group type index is present and > 0. */
export function resolveOfficialHeatmapMapType(
  taxonId: PollenMapTaxonId,
  typeIndexes?: Partial<Record<GooglePollenTypeKey, PollenUpiSnapshot>> | null,
): GooglePollenMapType | null {
  if (!hasGoogleGroupHeatmap(taxonId, typeIndexes)) return null;
  return pollenTaxonToGoogleMapType(taxonId);
}

/**
 * Prefer plant UPI. For birch/alder/olive never fall back to aggregated TREE
 * (that would make all three look identical). Grass/weed may use type UPI.
 */
export function resolveGoogleUpiForTaxon(
  taxonId: PollenMapTaxonId,
  day: GoogleForecastDayInput | undefined,
): PollenUpiSnapshot | null {
  if (!day) return null;
  const plantUpi = day.plantIndexes?.[taxonId];
  if (plantUpi) return plantUpi;
  if (isTreeSpeciesPollenTaxon(taxonId)) return null;
  const typeUpi = day.typeIndexes?.[googleTypeKeyForTaxon(taxonId)];
  return typeUpi ?? null;
}

/**
 * Builds map readings from a Google forecast day.
 * `value` stores the UPI index (0–5), not grains/m³ — UI must not show it as concentration.
 */
export function buildReadingsFromGoogleForecastDay(
  day: GoogleForecastDayInput,
  profileAllergenIds: ProfileAllergenId[],
): PollenMapReading[] {
  return POLLEN_MAP_TAXON_IDS.flatMap((taxonId) => {
    const upi = resolveGoogleUpiForTaxon(taxonId, day);
    if (!upi) return [];
    return [readingFromUpi(taxonId, upi.index, profileAllergenIds)];
  });
}

export function buildForecastDaysFromGoogle(
  days: GoogleForecastDayInput[],
  profileAllergenIds: ProfileAllergenId[],
): PollenForecastDay[] {
  return days
    .map((day) => ({
      date: day.date,
      readings: buildReadingsFromGoogleForecastDay(day, profileAllergenIds),
    }))
    .filter((day) => day.readings.length > 0);
}

export function buildUpiByTaxonFromGoogleDay(
  day: GoogleForecastDayInput | undefined,
): Partial<Record<PollenMapTaxonId, PollenUpiSnapshot>> {
  const result: Partial<Record<PollenMapTaxonId, PollenUpiSnapshot>> = {};
  if (!day) return result;
  for (const taxonId of POLLEN_MAP_TAXON_IDS) {
    const upi = resolveGoogleUpiForTaxon(taxonId, day);
    if (upi) result[taxonId] = upi;
  }
  return result;
}

/**
 * Merge Google plant/type readings with Open-Meteo species readings.
 * Prefer Google plant (or non-tree type) UPI; fill gaps from Open-Meteo.
 */
export function mergeGoogleAndOpenMeteoMapReadings(
  googleDay: GoogleForecastDayInput | undefined,
  openMeteoReadings: PollenMapReading[],
  profileAllergenIds: ProfileAllergenId[],
): {
  readings: PollenMapReading[];
  upiByTaxon: Partial<Record<PollenMapTaxonId, PollenUpiSnapshot>>;
} {
  const omByTaxon = new Map(openMeteoReadings.map((reading) => [reading.taxonId, reading]));
  const upiByTaxon: Partial<Record<PollenMapTaxonId, PollenUpiSnapshot>> = {};
  const readings: PollenMapReading[] = [];

  for (const taxonId of POLLEN_MAP_TAXON_IDS) {
    const googleUpi = resolveGoogleUpiForTaxon(taxonId, googleDay);
    if (googleUpi) {
      upiByTaxon[taxonId] = googleUpi;
      readings.push(readingFromUpi(taxonId, googleUpi.index, profileAllergenIds));
      continue;
    }
    const omReading = omByTaxon.get(taxonId);
    if (omReading) {
      upiByTaxon[taxonId] = readingToUpiSnapshot(omReading);
      readings.push({
        ...omReading,
        profileRelevant: profileMatchesPollenTaxon(profileAllergenIds, taxonId),
      });
    }
  }

  return { readings, upiByTaxon };
}

function readingFromUpi(
  taxonId: PollenMapTaxonId,
  index: PollenUpiIndex,
  profileAllergenIds: ProfileAllergenId[],
): PollenMapReading {
  const taxon = getPollenTaxon(taxonId);
  return {
    taxonId,
    allergenId: taxon?.allergenId ?? null,
    value: index,
    level: pollenTierFromUpi(index),
    profileRelevant: profileMatchesPollenTaxon(profileAllergenIds, taxonId),
  };
}
