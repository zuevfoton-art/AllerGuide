import { decodeDiaryDetails } from './diary-codec';
import type { DiaryEntry } from './types';

export interface DiaryStats {
  totalEntries: number;
  entriesLast7Days: number;
  byType: Record<string, number>;
  recentSymptoms: string[];
  topFoodItems: string[];
  /** Share of symptom entries with at least one SNOMED-coded symptom (C.1). */
  codedSymptomRate: number;
}

export interface DayBucket {
  iso: string;
  count: number;
  hasSymptoms: boolean;
  hasMeds: boolean;
  hasFood: boolean;
  hasTrigger: boolean;
}

export type DiaryCorrelationKind = 'symptom-food' | 'symptom-trigger' | 'symptom-meds' | null;

export type DiaryAnomalyKind = 'symptoms-without-trigger' | null;

export interface DiaryInsights {
  days: DayBucket[];
  streak: number;
  topTypes: Array<{ type: string; count: number }>;
  weekTotal: number;
  /** Day-level correlation (legacy). */
  correlationKind: DiaryCorrelationKind;
  correlationCount: number;
  correlationOf: number;
  /** Temporal ±4h correlation (C.3). */
  temporalCorrelationKind: DiaryCorrelationKind;
  temporalCorrelationCount: number;
  temporalCorrelationOf: number;
  /** C.6: consecutive symptom days without logged trigger. */
  anomalyKind: DiaryAnomalyKind;
  anomalyDays: number;
}

const TEMPORAL_WINDOW_MS = 4 * 3_600_000;
const ANOMALY_SYMPTOM_DAYS_THRESHOLD = 3;

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

function entryTime(entry: DiaryEntry): number {
  const t = new Date(entry.createdAt).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function withinWindow(symptomAt: number, otherAt: number, windowMs = TEMPORAL_WINDOW_MS): boolean {
  return Math.abs(symptomAt - otherAt) <= windowMs;
}

export function computeTemporalCorrelations(
  entries: DiaryEntry[],
  windowHours = 4,
): {
  kind: DiaryCorrelationKind;
  count: number;
  of: number;
} {
  const windowMs = windowHours * 3_600_000;
  const cutoff7 = Date.now() - 7 * 86_400_000;
  const weekEntries = entries.filter((e) => entryTime(e) >= cutoff7);

  const symptoms = weekEntries.filter((e) => e.type === 'Симптомы');
  const foods = weekEntries.filter((e) => e.type === 'Питание');
  const triggers = weekEntries.filter((e) => e.type === 'Триггер');
  const meds = weekEntries.filter((e) => e.type === 'Лекарство');

  if (!symptoms.length) return { kind: null, count: 0, of: 0 };

  let foodPairs = 0;
  let triggerPairs = 0;
  let medsPairs = 0;

  for (const symptom of symptoms) {
    const at = entryTime(symptom);
    if (foods.some((e) => withinWindow(at, entryTime(e), windowMs))) foodPairs++;
    if (triggers.some((e) => withinWindow(at, entryTime(e), windowMs))) triggerPairs++;
    if (meds.some((e) => withinWindow(at, entryTime(e), windowMs))) medsPairs++;
  }

  const of = symptoms.length;
  const threshold = Math.max(1, Math.ceil(of * 0.5));

  if (foodPairs >= threshold && foodPairs >= triggerPairs && foodPairs >= medsPairs) {
    return { kind: 'symptom-food', count: foodPairs, of };
  }
  if (triggerPairs >= threshold && triggerPairs >= medsPairs) {
    return { kind: 'symptom-trigger', count: triggerPairs, of };
  }
  if (medsPairs >= threshold) {
    return { kind: 'symptom-meds', count: medsPairs, of };
  }

  return { kind: null, count: 0, of };
}

export function detectSymptomWithoutTriggerAnomaly(days: DayBucket[]): {
  kind: DiaryAnomalyKind;
  days: number;
} {
  let maxRun = 0;
  let currentRun = 0;

  for (const day of days) {
    if (day.hasSymptoms && !day.hasTrigger) {
      currentRun++;
      maxRun = Math.max(maxRun, currentRun);
    } else {
      currentRun = 0;
    }
  }

  if (maxRun >= ANOMALY_SYMPTOM_DAYS_THRESHOLD) {
    return { kind: 'symptoms-without-trigger', days: maxRun };
  }
  return { kind: null, days: maxRun };
}

export function computeDiaryStats(entries: DiaryEntry[]): DiaryStats {
  const byType: Record<string, number> = {};
  const symptoms: string[] = [];
  const foods: string[] = [];
  let symptomEntries = 0;
  let codedSymptomEntries = 0;

  for (const entry of entries) {
    byType[entry.type] = (byType[entry.type] ?? 0) + 1;

    if (entry.type === 'Симптомы') {
      symptomEntries++;
      const payload = decodeDiaryDetails(entry.details);
      if (payload?.answers.symptomCodes?.trim()) codedSymptomEntries++;
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
    codedSymptomRate: symptomEntries ? codedSymptomEntries / symptomEntries : 0,
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

  let correlationKind: DiaryCorrelationKind = null;
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

  const temporal = computeTemporalCorrelations(entries);
  const anomaly = detectSymptomWithoutTriggerAnomaly(days);

  return {
    days,
    streak,
    topTypes,
    weekTotal,
    correlationKind,
    correlationCount,
    correlationOf,
    temporalCorrelationKind: temporal.kind,
    temporalCorrelationCount: temporal.count,
    temporalCorrelationOf: temporal.of,
    anomalyKind: anomaly.kind,
    anomalyDays: anomaly.days,
  };
}
