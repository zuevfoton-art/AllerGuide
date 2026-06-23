export type DoctorReportPeriod = 7 | 14 | 30 | 'custom';

export interface DoctorReportBlock {
  id: string;
  label: string;
  diaryTypes: string[];
  defaultEnabled: boolean;
}

export const DOCTOR_REPORT_TITLE =
  'Разработано под научным руководством проф. Смолкина Ю.С., Президента АДАИР';

export const DOCTOR_REPORT_DISCLAIMER =
  'Отчёт сформирован пользователем/родителем на основе самостоятельно введённых данных. ' +
  'Документ не является медицинской документацией.';

export const DOCTOR_REPORT_BLOCKS: DoctorReportBlock[] = [
  { id: 'symptoms', label: 'Симптомы', diaryTypes: ['Симптомы'], defaultEnabled: true },
  { id: 'medicine', label: 'Лекарства', diaryTypes: ['Лекарство'], defaultEnabled: true },
  { id: 'food', label: 'Питание', diaryTypes: ['Питание'], defaultEnabled: true },
  { id: 'triggers', label: 'Триггеры', diaryTypes: ['Триггер'], defaultEnabled: true },
  { id: 'peakflow', label: 'Пикфлоуметрия', diaryTypes: ['Пикфлоуметрия'], defaultEnabled: true },
  { id: 'asit', label: 'АСИТ', diaryTypes: ['АСИТ'], defaultEnabled: true },
  { id: 'skin', label: 'Кожные проявления', diaryTypes: ['Кожа'], defaultEnabled: true },
  { id: 'scales', label: 'Клинические шкалы', diaryTypes: ['Шкала'], defaultEnabled: true },
  { id: 'notes', label: 'Заметки', diaryTypes: ['Заметка', 'Визит к врачу'], defaultEnabled: false },
];

export interface PefTrendSummary {
  count: number;
  min: number | null;
  max: number | null;
  latest: number | null;
  latestAt: string | null;
}

export function computePefTrend(
  entries: { type: string; details: string; createdAt: string }[],
): PefTrendSummary {
  const values: { value: number; createdAt: string }[] = [];

  for (const entry of entries) {
    if (entry.type !== 'Пикфлоуметрия') continue;
    try {
      const parsed = JSON.parse(entry.details) as { v?: number; answers?: Record<string, string> };
      const raw = parsed?.answers?.pefValue ?? '';
      const num = Number(String(raw).replace(/[^\d.]/g, ''));
      if (Number.isFinite(num) && num > 0) {
        values.push({ value: num, createdAt: entry.createdAt });
      }
    } catch {
      // skip malformed
    }
  }

  if (!values.length) {
    return { count: 0, min: null, max: null, latest: null, latestAt: null };
  }

  const nums = values.map((v) => v.value);
  const latest = values[0];
  return {
    count: values.length,
    min: Math.min(...nums),
    max: Math.max(...nums),
    latest: latest.value,
    latestAt: latest.createdAt,
  };
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
