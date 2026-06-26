import type { ProfileAllergenId } from './profile-allergens';

/**
 * Open-Meteo / CAMS hourly pollen variable names (stable taxon ids).
 * @see https://open-meteo.com/en/docs/air-quality-api
 */
export type OpenMeteoPollenTaxonId =
  | 'alder_pollen'
  | 'birch_pollen'
  | 'grass_pollen'
  | 'mugwort_pollen'
  | 'olive_pollen'
  | 'ragweed_pollen';

/** Calendar-only taxa (no Open-Meteo hourly key, used in regional season tables). */
export type CalendarPollenTaxonId = 'oak_pollen' | 'rye_pollen';

export type PollenTaxonId = OpenMeteoPollenTaxonId | CalendarPollenTaxonId;

export interface PollenTaxon {
  id: PollenTaxonId;
  /** Canonical allergen id from `allergen-database.ts`, if profile-relevant. */
  allergenId: ProfileAllergenId | null;
  labelRu: string;
  /** Present for taxa fetched from Open-Meteo hourly API. */
  openMeteoHourlyKey?: OpenMeteoPollenTaxonId;
}

export const POLLEN_TAXA: PollenTaxon[] = [
  {
    id: 'alder_pollen',
    allergenId: null,
    labelRu: 'Ольха',
    openMeteoHourlyKey: 'alder_pollen',
  },
  {
    id: 'birch_pollen',
    allergenId: 'birch-pollen',
    labelRu: 'Берёза',
    openMeteoHourlyKey: 'birch_pollen',
  },
  {
    id: 'oak_pollen',
    allergenId: 'birch-pollen',
    labelRu: 'Дуб',
  },
  {
    id: 'grass_pollen',
    allergenId: 'grass-pollen',
    labelRu: 'Тимофеевка',
    openMeteoHourlyKey: 'grass_pollen',
  },
  {
    id: 'rye_pollen',
    allergenId: 'rye',
    labelRu: 'Рожь',
  },
  {
    id: 'mugwort_pollen',
    allergenId: 'mugwort-pollen',
    labelRu: 'Полынь',
    openMeteoHourlyKey: 'mugwort_pollen',
  },
  {
    id: 'olive_pollen',
    allergenId: null,
    labelRu: 'Олива',
    openMeteoHourlyKey: 'olive_pollen',
  },
  {
    id: 'ragweed_pollen',
    allergenId: 'ragweed-pollen',
    labelRu: 'Амброзия',
    openMeteoHourlyKey: 'ragweed_pollen',
  },
];

const taxonById = new Map(POLLEN_TAXA.map((item) => [item.id, item]));

/** Open-Meteo hourly keys available for live pollen fetch (B.1). */
export const OPEN_METEO_POLLEN_TAXON_IDS: OpenMeteoPollenTaxonId[] = [
  'alder_pollen',
  'birch_pollen',
  'grass_pollen',
  'mugwort_pollen',
  'olive_pollen',
  'ragweed_pollen',
];

/** @deprecated Use `mapOpenMeteoHourlyKeyToAllergenId` — kept for backward compatibility. */
export const OPEN_METEO_POLLEN_ALLERGEN_IDS: Record<string, ProfileAllergenId> = Object.fromEntries(
  POLLEN_TAXA.filter((item) => item.openMeteoHourlyKey && item.allergenId).map((item) => [
    item.openMeteoHourlyKey!,
    item.allergenId!,
  ]),
);

export function getPollenTaxon(taxonId: PollenTaxonId): PollenTaxon | undefined {
  return taxonById.get(taxonId);
}

export function mapOpenMeteoHourlyKeyToAllergenId(
  hourlyKey: string,
): ProfileAllergenId | undefined {
  const taxon = taxonById.get(hourlyKey as PollenTaxonId);
  return taxon?.allergenId ?? undefined;
}

/** Whether a profile allergen list is sensitive to this pollen taxon (exact id match, not substring). */
export function profileMatchesPollenTaxon(
  profileAllergenIds: ProfileAllergenId[],
  taxonId: PollenTaxonId,
): boolean {
  const taxon = getPollenTaxon(taxonId);
  if (!taxon?.allergenId) return false;
  return profileAllergenIds.includes(taxon.allergenId);
}

export function profileHasPollenAllergen(
  profileAllergenIds: ProfileAllergenId[],
  pollenAllergenId: ProfileAllergenId,
): boolean {
  return profileAllergenIds.includes(pollenAllergenId);
}

export interface PollenReading {
  taxonId: PollenTaxonId;
  allergenId: ProfileAllergenId | null;
  label: string;
  value: number;
  profileRelevant: boolean;
}

/** Parse Open-Meteo hourly payload into taxon-based pollen readings (B.1). */
export function parseOpenMeteoPollenHourly(
  hourly: Record<string, number[]>,
  profileAllergenIds: ProfileAllergenId[],
  labelForTaxon: (taxonId: OpenMeteoPollenTaxonId) => string = (id) =>
    getPollenTaxon(id)?.labelRu ?? id,
): PollenReading[] {
  const readings: PollenReading[] = [];

  for (const taxonId of OPEN_METEO_POLLEN_TAXON_IDS) {
    const values = hourly[taxonId];
    if (!values?.length) continue;

    const value = Math.max(...values.filter((v) => Number.isFinite(v)));
    const taxon = getPollenTaxon(taxonId)!;

    readings.push({
      taxonId,
      allergenId: taxon.allergenId,
      label: labelForTaxon(taxonId),
      value,
      profileRelevant: profileMatchesPollenTaxon(profileAllergenIds, taxonId),
    });
  }

  return readings;
}
