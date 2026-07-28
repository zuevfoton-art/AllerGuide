import { classifyPollenConcentration, type PollenTierLevel } from './pollen-thresholds';
import {
  getPollenTaxon,
  profileMatchesPollenTaxon,
  type OpenMeteoPollenTaxonId,
} from './pollen-taxonomy';
import type { ProfileAllergenId } from './profile-allergens';

export const POLLEN_MAP_TAXON_IDS = [
  'birch_pollen',
  'grass_pollen',
  'ragweed_pollen',
] as const satisfies readonly OpenMeteoPollenTaxonId[];

export type PollenMapTaxonId = (typeof POLLEN_MAP_TAXON_IDS)[number];

export interface PollenMapReading {
  taxonId: PollenMapTaxonId;
  allergenId: ProfileAllergenId | null;
  value: number;
  level: PollenTierLevel;
  profileRelevant: boolean;
}

export interface OpenMeteoPollenHourly {
  time?: string[];
  birch_pollen?: Array<number | null>;
  grass_pollen?: Array<number | null>;
  ragweed_pollen?: Array<number | null>;
}

const YANDEX_WEATHER_REGION_SLUGS: Record<string, string> = {
  moscow: 'moscow',
  'saint-petersburg': 'saint-petersburg',
  krasnodar: 'krasnodar',
  novosibirsk: 'novosibirsk',
  ekaterinburg: 'yekaterinburg',
};

/**
 * Parse the hour matching Open-Meteo's current timestamp. Missing taxa are
 * omitted so callers can distinguish unavailable CAMS coverage from zero.
 */
export function parseCurrentPollenMapReadings(
  hourly: OpenMeteoPollenHourly,
  currentTime: string | undefined,
  profileAllergenIds: ProfileAllergenId[],
): PollenMapReading[] {
  const timeIndex = resolveCurrentTimeIndex(hourly.time, currentTime);
  if (timeIndex < 0) return [];

  const readings: PollenMapReading[] = [];

  for (const taxonId of POLLEN_MAP_TAXON_IDS) {
    const value = hourly[taxonId]?.[timeIndex];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;

    const taxon = getPollenTaxon(taxonId);
    readings.push({
      taxonId,
      allergenId: taxon?.allergenId ?? null,
      value,
      level: classifyPollenConcentration(value, taxonId),
      profileRelevant: profileMatchesPollenTaxon(profileAllergenIds, taxonId),
    });
  }

  return readings;
}

export function buildYandexPollenUrl(regionId: string): string {
  const slug = YANDEX_WEATHER_REGION_SLUGS[regionId] ?? YANDEX_WEATHER_REGION_SLUGS.moscow;
  return `https://yandex.ru/pogoda/ru/${slug}/allergies`;
}

function resolveCurrentTimeIndex(times: string[] | undefined, currentTime: string | undefined): number {
  if (!times?.length) return -1;
  if (!currentTime) return 0;

  const exactIndex = times.indexOf(currentTime);
  if (exactIndex >= 0) return exactIndex;

  const currentHour = currentTime.slice(0, 13);
  const sameHourIndex = times.findIndex((time) => time.slice(0, 13) === currentHour);
  return sameHourIndex >= 0 ? sameHourIndex : 0;
}
