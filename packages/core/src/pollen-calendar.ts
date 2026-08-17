import type { ProfileAllergenId } from './profile-allergens';
import {
  getPollenTaxon,
  profileMatchesPollenTaxon,
  type PollenTaxonId,
} from './pollen-taxonomy';
import {
  DEFAULT_POLLEN_REGION_ID,
  getPollenRegion,
  type PollenRegion,
} from './pollen-regions';

export interface PollenSeasonPeak {
  taxonId: PollenTaxonId;
  /** Canonical allergen id for profile matching (B.1). */
  allergenId: ProfileAllergenId | null;
  /** Localized display label (RU). */
  label: string;
  months: number[];
  peakMonth: number;
  regionId: string;
}

type PeakSeed = Omit<PollenSeasonPeak, 'regionId'>;

function withRegion(regionId: string, peaks: PeakSeed[]): PollenSeasonPeak[] {
  return peaks.map((peak) => ({ ...peak, regionId }));
}

/** Season row; allergenId comes from taxonomy so alder/olive stay profile-relevant. */
function seasonPeak(
  taxonId: PollenTaxonId,
  label: string,
  months: number[],
  peakMonth: number,
): PeakSeed {
  return {
    taxonId,
    allergenId: getPollenTaxon(taxonId)?.allergenId ?? null,
    label,
    months,
    peakMonth,
  };
}

const MOSCOW_PEAKS: PeakSeed[] = [
  seasonPeak('alder_pollen', 'Ольха', [3, 4], 4),
  seasonPeak('birch_pollen', 'Берёза', [4, 5], 5),
  seasonPeak('oak_pollen', 'Дуб', [4, 5], 5),
  seasonPeak('grass_pollen', 'Тимофеевка', [6, 7], 6),
  seasonPeak('rye_pollen', 'Рожь', [6, 7], 7),
  seasonPeak('mugwort_pollen', 'Полынь', [7, 8], 8),
  seasonPeak('ragweed_pollen', 'Амброзия', [8, 9], 8),
];

const SAINT_PETERSBURG_PEAKS: PeakSeed[] = [
  seasonPeak('alder_pollen', 'Ольха', [4, 5], 5),
  seasonPeak('birch_pollen', 'Берёза', [5, 6], 5),
  seasonPeak('oak_pollen', 'Дуб', [5, 6], 6),
  seasonPeak('grass_pollen', 'Тимофеевка', [6, 7], 7),
  seasonPeak('rye_pollen', 'Рожь', [7, 8], 7),
  seasonPeak('mugwort_pollen', 'Полынь', [8], 8),
  seasonPeak('ragweed_pollen', 'Амброзия', [8, 9], 9),
];

const KRASNODAR_PEAKS: PeakSeed[] = [
  seasonPeak('alder_pollen', 'Ольха', [2, 3], 3),
  seasonPeak('birch_pollen', 'Берёза', [3, 4], 4),
  seasonPeak('grass_pollen', 'Тимофеевка', [5, 6], 5),
  seasonPeak('olive_pollen', 'Олива', [5, 6], 5),
  seasonPeak('mugwort_pollen', 'Полынь', [7, 8], 7),
  seasonPeak('ragweed_pollen', 'Амброзия', [7, 8, 9], 8),
];

const NOVOSIBIRSK_PEAKS: PeakSeed[] = [
  seasonPeak('birch_pollen', 'Берёза', [5, 6], 6),
  seasonPeak('grass_pollen', 'Тимофеевка', [6, 7], 7),
  seasonPeak('rye_pollen', 'Рожь', [7, 8], 7),
  seasonPeak('mugwort_pollen', 'Полынь', [8], 8),
  seasonPeak('ragweed_pollen', 'Амброзия', [8, 9], 8),
];

const EKATERINBURG_PEAKS: PeakSeed[] = [
  seasonPeak('birch_pollen', 'Берёза', [5, 6], 5),
  seasonPeak('grass_pollen', 'Тимофеевка', [6, 7], 6),
  seasonPeak('rye_pollen', 'Рожь', [7], 7),
  seasonPeak('mugwort_pollen', 'Полынь', [7, 8], 8),
  seasonPeak('ragweed_pollen', 'Амброзия', [8, 9], 8),
];

/** Regional pollen season tables keyed by `PollenRegion.id` (B.2). */
export const POLLEN_CALENDARS: Record<string, PollenSeasonPeak[]> = {
  moscow: withRegion('moscow', MOSCOW_PEAKS),
  'saint-petersburg': withRegion('saint-petersburg', SAINT_PETERSBURG_PEAKS),
  krasnodar: withRegion('krasnodar', KRASNODAR_PEAKS),
  novosibirsk: withRegion('novosibirsk', NOVOSIBIRSK_PEAKS),
  ekaterinburg: withRegion('ekaterinburg', EKATERINBURG_PEAKS),
};

/** @deprecated Use `POLLEN_CALENDARS.moscow` */
export const POLLEN_CALENDAR_MOSCOW = POLLEN_CALENDARS.moscow;

const MONTH_NAMES_RU = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

export function getPollenCalendar(regionId = DEFAULT_POLLEN_REGION_ID): PollenSeasonPeak[] {
  return POLLEN_CALENDARS[regionId] ?? POLLEN_CALENDARS[DEFAULT_POLLEN_REGION_ID];
}

export function getPollenPeaksForMonth(
  month: number,
  regionId = DEFAULT_POLLEN_REGION_ID,
): PollenSeasonPeak[] {
  return getPollenCalendar(regionId).filter((peak) => peak.months.includes(month));
}

export function formatPollenMonth(month: number): string {
  return MONTH_NAMES_RU[month - 1] ?? String(month);
}

/** Profile-relevant peaks this month — matched by `pollen_taxon_id` / allergenId, not substring (B.1). */
export function getCurrentPollenAlerts(
  month: number,
  profileAllergenIds: ProfileAllergenId[],
  regionId = DEFAULT_POLLEN_REGION_ID,
): PollenSeasonPeak[] {
  return getPollenPeaksForMonth(month, regionId).filter((peak) =>
    profileMatchesPollenTaxon(profileAllergenIds, peak.taxonId),
  );
}

export function getPollenRegionLabel(regionId: string): string {
  return getPollenRegion(regionId)?.name ?? getPollenRegion(DEFAULT_POLLEN_REGION_ID)!.name;
}

export function buildWellnessLocationFromRegion(region: PollenRegion): {
  lat: number;
  lon: number;
  label: string;
  regionId: string;
  timezone: string;
} {
  return {
    lat: region.lat,
    lon: region.lon,
    label: region.name,
    regionId: region.id,
    timezone: region.timezone,
  };
}
