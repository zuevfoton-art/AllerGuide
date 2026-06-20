import { decodeDiaryDetails } from './diary';
import type { DiaryEntry } from './types';

export interface DiaryStats {
  totalEntries: number;
  entriesLast7Days: number;
  byType: Record<string, number>;
  recentSymptoms: string[];
  topFoodItems: string[];
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
