import {
  computePefPercentOfBest,
  computePefZone,
  formatPefZoneLabel,
  parsePefNumeric,
  resolvePersonalBestPef,
  type PefZone,
} from './pef-zones';

export type DoctorReportPeriod = 7 | 14 | 30 | 'custom';

export interface DoctorReportBlock {
  id: string;
  label: string;
  diaryTypes: string[];
  defaultEnabled: boolean;
}

export const DOCTOR_REPORT_TITLE = 'A-Claro — отчёт для врача';

export const DOCTOR_REPORT_DISCLAIMER =
  'Отчёт сформирован пользователем/родителем на основе самостоятельно введённых данных. ' +
  'Документ не является медицинской документацией.';

export const DOCTOR_REPORT_BLOCKS: DoctorReportBlock[] = [
  { id: 'symptoms', label: 'Симптомы', diaryTypes: ['Симптомы'], defaultEnabled: true },
  { id: 'medicine', label: 'Лекарства', diaryTypes: ['Лекарство'], defaultEnabled: true },
  { id: 'food', label: 'Питание', diaryTypes: ['Питание'], defaultEnabled: true },
  { id: 'triggers', label: 'Триггеры', diaryTypes: ['Триггер'], defaultEnabled: true },
  {
    id: 'triggerContext',
    label: 'Контекст триггеров',
    diaryTypes: [],
    defaultEnabled: true,
  },
  { id: 'peakflow', label: 'Пикфлоуметрия', diaryTypes: ['Пикфлоуметрия'], defaultEnabled: true },
  {
    id: 'asthma',
    label: 'Бронхиальная астма',
    diaryTypes: [],
    defaultEnabled: true,
  },
  { id: 'asit', label: 'АСИТ', diaryTypes: ['АСИТ'], defaultEnabled: true },
  {
    id: 'foodDrug',
    label: 'Пищевая и лекарственная аллергия',
    diaryTypes: [],
    defaultEnabled: true,
  },
  {
    id: 'insect',
    label: 'Инсектная аллергия',
    diaryTypes: ['Укус насекомого'],
    defaultEnabled: true,
  },
  { id: 'skin', label: 'Кожные проявления', diaryTypes: ['Кожа'], defaultEnabled: true },
  { id: 'scales', label: 'Клинические шкалы', diaryTypes: ['Шкала'], defaultEnabled: true },
  {
    id: 'timeline',
    label: 'Хронология',
    diaryTypes: [],
    defaultEnabled: true,
  },
  {
    id: 'conditionPhenotypes',
    label: 'Хронология и фенотипы профиля',
    diaryTypes: [],
    defaultEnabled: true,
  },
  { id: 'notes', label: 'Заметки', diaryTypes: ['Заметка', 'Визит к врачу'], defaultEnabled: false },
];

export interface PefTrendSummary {
  count: number;
  min: number | null;
  max: number | null;
  latest: number | null;
  latestAt: string | null;
  personalBest: number | null;
  latestPercentOfBest: number | null;
  latestZone: PefZone | null;
}

interface PefDiaryReading {
  value: number;
  best: string | null;
  createdAt: string;
}

function parsePefDiaryEntry(entry: { type: string; details: string; createdAt: string }): PefDiaryReading | null {
  if (entry.type !== 'Пикфлоуметрия') return null;
  try {
    const parsed = JSON.parse(entry.details) as { v?: number; answers?: Record<string, string> };
    const value = parsePefNumeric(parsed?.answers?.pefValue ?? '');
    if (!value) return null;
    const best = parsed?.answers?.pefBest?.trim() || null;
    return { value, best, createdAt: entry.createdAt };
  } catch {
    return null;
  }
}

export function computePefTrend(
  entries: { type: string; details: string; createdAt: string }[],
  options: { planPersonalBest?: string | number | null } = {},
): PefTrendSummary {
  const readings = entries
    .map((entry) => parsePefDiaryEntry(entry))
    .filter((item): item is PefDiaryReading => item != null);

  if (!readings.length) {
    return {
      count: 0,
      min: null,
      max: null,
      latest: null,
      latestAt: null,
      personalBest: null,
      latestPercentOfBest: null,
      latestZone: null,
    };
  }

  const nums = readings.map((item) => item.value);
  const latest = readings[0];
  const personalBest = resolvePersonalBestPef({
    explicitBest: latest.best,
    planBest: options.planPersonalBest,
    entryBests: readings.map((item) => item.best),
    historicalValues: nums,
  });
  const latestPercentOfBest =
    personalBest && latest.value ? computePefPercentOfBest(latest.value, personalBest) : null;
  const latestZone =
    personalBest && latest.value ? computePefZone(latest.value, personalBest) : null;

  return {
    count: readings.length,
    min: Math.min(...nums),
    max: Math.max(...nums),
    latest: latest.value,
    latestAt: latest.createdAt,
    personalBest,
    latestPercentOfBest,
    latestZone,
  };
}

export function formatPefTrendSummary(trend: PefTrendSummary): string {
  if (!trend.count) return 'Нет измерений ПСВ за период.';

  const parts = [
    `Измерений: ${trend.count}`,
    `Min: ${trend.min ?? '—'}`,
    `Max: ${trend.max ?? '—'}`,
    `Последнее: ${trend.latest ?? '—'} л/мин`,
  ];
  if (trend.personalBest) {
    parts.push(`Лучшее (ориентир): ${trend.personalBest} л/мин`);
  }
  if (trend.latestPercentOfBest != null) {
    parts.push(`${trend.latestPercentOfBest}% от лучшего`);
  }
  if (trend.latestZone) {
    parts.push(formatPefZoneLabel(trend.latestZone));
  }
  if (trend.latestAt) {
    parts.push(`(${trend.latestAt})`);
  }
  return `${parts.join('. ')}.`;
}

export function getDefaultReportBlockIds(): string[] {
  return DOCTOR_REPORT_BLOCKS.filter((b) => b.defaultEnabled).map((b) => b.id);
}

export function getReportDiaryTypes(blockIds: string[]): string[] {
  const types = new Set<string>();
  for (const block of DOCTOR_REPORT_BLOCKS) {
    if (blockIds.includes(block.id)) {
      for (const type of block.diaryTypes) types.add(type);
    }
  }
  return [...types];
}

export function periodToDays(period: DoctorReportPeriod): number | null {
  if (period === 'custom') return null;
  return period;
}
