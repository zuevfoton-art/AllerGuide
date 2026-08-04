import {
  POLLEN_MAP_TAXON_IDS,
  type PollenForecastDay,
  type PollenMapReading,
  type PollenMapTaxonId,
  type PollenUpiSnapshot,
} from './pollen-map';
import { getPollenTaxon, profileMatchesPollenTaxon } from './pollen-taxonomy';
import type { ProfileAllergenId } from './profile-allergens';
import { pollenTierFromUpi, type PollenUpiIndex } from './pollen-upi';

export type GooglePollenTypeKey = 'TREE' | 'GRASS' | 'WEED';

/** Minimal day shape shared by API proxy and mobile client. */
export interface GoogleForecastDayInput {
  date: string;
  typeIndexes?: Partial<Record<GooglePollenTypeKey, PollenUpiSnapshot>>;
  plantIndexes?: Partial<Record<PollenMapTaxonId, PollenUpiSnapshot>>;
}

export function googleTypeKeyForTaxon(taxonId: PollenMapTaxonId): GooglePollenTypeKey {
  if (taxonId === 'grass_pollen') return 'GRASS';
  if (taxonId === 'ragweed_pollen' || taxonId === 'mugwort_pollen') return 'WEED';
  return 'TREE';
}

/** Prefer plant UPI, then TREE/GRASS/WEED type index for the taxon's group. */
export function resolveGoogleUpiForTaxon(
  taxonId: PollenMapTaxonId,
  day: GoogleForecastDayInput | undefined,
): PollenUpiSnapshot | null {
  if (!day) return null;
  const plantUpi = day.plantIndexes?.[taxonId];
  if (plantUpi) return plantUpi;
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
