export interface PollenSeasonPeak {
  allergen: string;
  months: number[];
  peakMonth: number;
  region: string;
}

export const POLLEN_CALENDAR_MOSCOW: PollenSeasonPeak[] = [
  { allergen: 'Ольха', months: [3, 4], peakMonth: 4, region: 'Москва' },
  { allergen: 'Берёза', months: [4, 5], peakMonth: 5, region: 'Москва' },
  { allergen: 'Дуб', months: [4, 5], peakMonth: 5, region: 'Москва' },
  { allergen: 'Тимофеевка', months: [6, 7], peakMonth: 6, region: 'Москва' },
  { allergen: 'Рожь', months: [6, 7], peakMonth: 7, region: 'Москва' },
  { allergen: 'Полынь', months: [7, 8], peakMonth: 8, region: 'Москва' },
  { allergen: 'Амброзия', months: [8, 9], peakMonth: 8, region: 'Москва' },
];

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

export function getPollenPeaksForMonth(month: number, region = 'Москва'): PollenSeasonPeak[] {
  return POLLEN_CALENDAR_MOSCOW.filter(
    (p) => p.region === region && p.months.includes(month),
  );
}

export function formatPollenMonth(month: number): string {
  return MONTH_NAMES_RU[month - 1] ?? String(month);
}

export function getCurrentPollenAlerts(
  month: number,
  profileAllergens: string[],
  region = 'Москва',
): PollenSeasonPeak[] {
  const peaks = getPollenPeaksForMonth(month, region);
  const normalized = profileAllergens.map((a) => a.toLowerCase());
  return peaks.filter((p) =>
    normalized.some((a) => p.allergen.toLowerCase().includes(a) || a.includes(p.allergen.toLowerCase())),
  );
}
