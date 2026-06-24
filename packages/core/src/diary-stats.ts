import { decodeDiaryDetails } from './diary';
import type { DiaryEntry } from './types';

export interface DiaryStats {
  totalEntries: number;
  entriesLast7Days: number;
  byType: Record<string, number>;
  recentSymptoms: string[];
  topFoodItems: string[];
}

export interface DayBucket {
  iso: string;
  count: number;
  hasSymptoms: boolean;
  hasMeds: boolean;
  hasFood: boolean;
  hasTrigger: boolean;
}

export interface DiaryInsights {
  days: DayBucket[];
  streak: number;
  topTypes: Array<{ type: string; count: number }>;
  weekTotal: number;
  correlationKind: 'symptom-food' | 'symptom-trigger' | 'symptom-meds' | null;
  correlationCount: number;
  correlationOf: number;
}

function daysAgo(dateIso: string, days: number): boolean {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return false;
  const cutoff = Date.now() - days * 86_400_000;
  return date.getTime() >= cutoff;
}

function extractAnswer(entry: DiaryEntry, key: string): string | null {
  const structured = decodeDiaryDetails(entry.details);
  const value = structured?.answers[key]?.trim();
  return value || null;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computeDiaryStats(entries: DiaryEntry[]): DiaryStats {
  const byType: Record<string, number> = {};
  const symptoms: string[] = [];
  const foods: string[] = [];

  for (const entry of entries) {
    byType[entry.type] = (byType[entry.type] ?? 0) + 1;

    if (entry.type === 'Симптомы') {
      const value = extractAnswer(entry, 'symptoms');
      if (value) symptoms.push(value);
    }

    if (entry.type === 'Питание') {
      const value = extractAnswer(entry, 'food');
      if (value) foods.push(value);
    }
  }

  return {
    totalEntries: entries.length,
    entriesLast7Days: entries.filter((entry) => daysAgo(entry.createdAt, 7)).length,
    byType,
    recentSymptoms: symptoms.slice(0, 3),
    topFoodItems: foods.slice(0, 3),
  };
}

export function computeDiaryInsights(entries: DiaryEntry[]): DiaryInsights {
  const today = new Date();

  const days: DayBucket[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({
      iso: isoDate(d),
      count: 0,
      hasSymptoms: false,
      hasMeds: false,
      hasFood: false,
      hasTrigger: false,
    });
  }

  const bucketMap: Record<string, DayBucket> = {};
  for (const day of days) bucketMap[day.iso] = day;

  const weekTypes: Record<string, number> = {};
  const cutoff7 = Date.now() - 7 * 86_400_000;

  for (const entry of entries) {
    const d = new Date(entry.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const iso = isoDate(d);
    const bucket = bucketMap[iso];
    if (bucket) {
      bucket.count++;
      if (entry.type === 'Симптомы') bucket.hasSymptoms = true;
      if (entry.type === 'Лекарство') bucket.hasMeds = true;
      if (entry.type === 'Питание') bucket.hasFood = true;
      if (entry.type === 'Триггер') bucket.hasTrigger = true;
    }
    if (d.getTime() >= cutoff7) {
      weekTypes[entry.type] = (weekTypes[entry.type] ?? 0) + 1;
    }
  }

  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) streak++;
    else break;
  }

  const topTypes = Object.entries(weekTypes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([type, count]) => ({ type, count }));

  const weekTotal = days.reduce((s, d) => s + d.count, 0);

  const symptomDays = days.filter((d) => d.hasSymptoms);
  const foodWithSym = symptomDays.filter((d) => d.hasFood).length;
  const trigWithSym = symptomDays.filter((d) => d.hasTrigger).length;
  const medsWithSym = symptomDays.filter((d) => d.hasMeds).length;

  let correlationKind: DiaryInsights['correlationKind'] = null;
  let correlationCount = 0;
  const correlationOf = symptomDays.length;

  if (correlationOf >= 2) {
    const threshold = correlationOf * 0.5;
    if (foodWithSym >= threshold && foodWithSym >= trigWithSym && foodWithSym >= medsWithSym) {
      correlationKind = 'symptom-food';
      correlationCount = foodWithSym;
    } else if (trigWithSym >= threshold && trigWithSym >= medsWithSym) {
      correlationKind = 'symptom-trigger';
      correlationCount = trigWithSym;
    } else if (medsWithSym >= threshold) {
      correlationKind = 'symptom-meds';
      correlationCount = medsWithSym;
    }
  }

  return { days, streak, topTypes, weekTotal, correlationKind, correlationCount, correlationOf };
}
