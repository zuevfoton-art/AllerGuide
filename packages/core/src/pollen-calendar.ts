import type { ProfileAllergenId } from './profile-allergens';
import {
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

const MOSCOW_PEAKS: PeakSeed[] = [
  { taxonId: 'alder_pollen', allergenId: null, label: 'Ольха', months: [3, 4], peakMonth: 4 },
  { taxonId: 'birch_pollen', allergenId: 'birch-pollen', label: 'Берёза', months: [4, 5], peakMonth: 5 },
  { taxonId: 'oak_pollen', allergenId: 'birch-pollen', label: 'Дуб', months: [4, 5], peakMonth: 5 },
  { taxonId: 'grass_pollen', allergenId: 'grass-pollen', label: 'Тимофеевка', months: [6, 7], peakMonth: 6 },
  { taxonId: 'rye_pollen', allergenId: 'rye', label: 'Рожь', months: [6, 7], peakMonth: 7 },
  { taxonId: 'mugwort_pollen', allergenId: 'mugwort-pollen', label: 'Полынь', months: [7, 8], peakMonth: 8 },
  { taxonId: 'ragweed_pollen', allergenId: 'ragweed-pollen', label: 'Амброзия', months: [8, 9], peakMonth: 8 },
];

const SAINT_PETERSBURG_PEAKS: PeakSeed[] = [
  { taxonId: 'alder_pollen', allergenId: null, label: 'Ольха', months: [4, 5], peakMonth: 5 },
  { taxonId: 'birch_pollen', allergenId: 'birch-pollen', label: 'Берёза', months: [5, 6], peakMonth: 5 },
  { taxonId: 'oak_pollen', allergenId: 'birch-pollen', label: 'Дуб', months: [5, 6], peakMonth: 6 },
  { taxonId: 'grass_pollen', allergenId: 'grass-pollen', label: 'Тимофеевка', months: [6, 7], peakMonth: 7 },
  { taxonId: 'rye_pollen', allergenId: 'rye', label: 'Рожь', months: [7, 8], peakMonth: 7 },
  { taxonId: 'mugwort_pollen', allergenId: 'mugwort-pollen', label: 'Полынь', months: [8], peakMonth: 8 },
  { taxonId: 'ragweed_pollen', allergenId: 'ragweed-pollen', label: 'Амброзия', months: [8, 9], peakMonth: 9 },
];

const KRASNODAR_PEAKS: PeakSeed[] = [
  { taxonId: 'alder_pollen', allergenId: null, label: 'Ольха', months: [2, 3], peakMonth: 3 },
  { taxonId: 'birch_pollen', allergenId: 'birch-pollen', label: 'Берёза', months: [3, 4], peakMonth: 4 },
  { taxonId: 'grass_pollen', allergenId: 'grass-pollen', label: 'Тимофеевка', months: [5, 6], peakMonth: 5 },
  { taxonId: 'olive_pollen', allergenId: null, label: 'Олива', months: [5, 6], peakMonth: 5 },
  { taxonId: 'mugwort_pollen', allergenId: 'mugwort-pollen', label: 'Полынь', months: [7, 8], peakMonth: 7 },
  { taxonId: 'ragweed_pollen', allergenId: 'ragweed-pollen', label: 'Амброзия', months: [7, 8, 9], peakMonth: 8 },
];

const NOVOSIBIRSK_PEAKS: PeakSeed[] = [
  { taxonId: 'birch_pollen', allergenId: 'birch-pollen', label: 'Берёза', months: [5, 6], peakMonth: 6 },
  { taxonId: 'grass_pollen', allergenId: 'grass-pollen', label: 'Тимофеевка', months: [6, 7], peakMonth: 7 },
  { taxonId: 'rye_pollen', allergenId: 'rye', label: 'Рожь', months: [7, 8], peakMonth: 7 },
  { taxonId: 'mugwort_pollen', allergenId: 'mugwort-pollen', label: 'Полынь', months: [8], peakMonth: 8 },
  { taxonId: 'ragweed_pollen', allergenId: 'ragweed-pollen', label: 'Амброзия', months: [8, 9], peakMonth: 8 },
];

const EKATERINBURG_PEAKS: PeakSeed[] = [
  { taxonId: 'birch_pollen', allergenId: 'birch-pollen', label: 'Берёза', months: [5, 6], peakMonth: 5 },
  { taxonId: 'grass_pollen', allergenId: 'grass-pollen', label: 'Тимофеевка', months: [6, 7], peakMonth: 6 },
  { taxonId: 'rye_pollen', allergenId: 'rye', label: 'Рожь', months: [7], peakMonth: 7 },
  { taxonId: 'mugwort_pollen', allergenId: 'mugwort-pollen', label: 'Полынь', months: [7, 8], peakMonth: 8 },
  { taxonId: 'ragweed_pollen', allergenId: 'ragweed-pollen', label: 'Амброзия', months: [8, 9], peakMonth: 8 },
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
