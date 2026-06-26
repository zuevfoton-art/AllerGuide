import { decodeDiaryDetails } from './diary-codec';
import { formatDiaryDate } from './diary';
import type { DiaryEntry } from './types';

export interface DiaryTriggerContext {
  pollenSummary?: string;
  recentScanSummary?: string;
  todayMedsSummary?: string;
}

export interface TriggerPrefillInput {
  pollenSummary?: string;
  recentScan?: { productName?: string | null; verdict: string; level: string; createdAt: string };
  todayMedicineEntries?: DiaryEntry[];
  now?: Date;
}

function isToday(iso: string, now: Date): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isWithinHours(iso: string, hours: number, now: Date): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return now.getTime() - date.getTime() <= hours * 3_600_000;
}

export function extractTodayMedicines(entries: DiaryEntry[], now = new Date()): string[] {
  const meds: string[] = [];
  for (const entry of entries) {
    if (entry.type !== 'Лекарство' || !isToday(entry.createdAt, now)) continue;
    const structured = decodeDiaryDetails(entry.details);
    const name = structured?.answers.medicine?.trim();
    const dosage = structured?.answers.dosage?.trim();
    if (!name) continue;
    meds.push(dosage ? `${name} (${dosage})` : name);
  }
  return meds;
}

export function buildTriggerContext(input: TriggerPrefillInput): DiaryTriggerContext {
  const now = input.now ?? new Date();
  const context: DiaryTriggerContext = {};

  if (input.pollenSummary?.trim()) {
    context.pollenSummary = input.pollenSummary.trim();
  }

  if (input.recentScan && isWithinHours(input.recentScan.createdAt, 24, now)) {
    const name = input.recentScan.productName?.trim() || 'продукт';
    context.recentScanSummary = `${name}: ${input.recentScan.verdict} (${input.recentScan.level})`;
  }

  const meds = extractTodayMedicines(input.todayMedicineEntries ?? [], now);
  if (meds.length) {
    context.todayMedsSummary = meds.join('; ');
  }

  return context;
}

export function buildTriggerPrefill(context: DiaryTriggerContext): Record<string, string> {
  const prefill: Record<string, string> = {};
  const contextParts: string[] = [];

  if (context.pollenSummary) {
    prefill.pollenContext = context.pollenSummary;
    contextParts.push(`Пыльца: ${context.pollenSummary}`);
  }
  if (context.recentScanSummary) {
    prefill.recentScan = context.recentScanSummary;
    contextParts.push(`Скан: ${context.recentScanSummary}`);
  }
  if (context.todayMedsSummary) {
    prefill.todayMeds = context.todayMedsSummary;
  }

  if (contextParts.length) {
    const existing = prefill.context ?? '';
    prefill.context = [existing, contextParts.join('. ')].filter(Boolean).join('\n');
  }

  return prefill;
}

export function formatTriggerContextLine(context: DiaryTriggerContext): string {
  const parts: string[] = [];
  if (context.pollenSummary) parts.push(`Пыльца: ${context.pollenSummary}`);
  if (context.recentScanSummary) parts.push(`Скан: ${context.recentScanSummary}`);
  if (context.todayMedsSummary) parts.push(`ЛС сегодня: ${context.todayMedsSummary}`);
  return parts.join(' · ');
}

export function formatTriggerContextReport(
  entries: { type: string; details: string; createdAt: string }[],
): string {
  const lines: string[] = [];
  for (const entry of entries) {
    if (entry.type !== 'Триггер') continue;
    const payload = decodeDiaryDetails(entry.details);
    if (!payload) continue;

    const parts: string[] = [];
    const trigger = payload.answers.trigger?.trim();
    const pollen = payload.answers.pollenContext?.trim();
    const scan = payload.answers.recentScan?.trim();
    const meds = payload.answers.todayMeds?.trim();
    const hasContext = Boolean(pollen || scan || meds);
    if (!hasContext) continue;

    if (trigger) parts.push(trigger);
    if (pollen) parts.push(`Пыльца: ${pollen}`);
    if (scan) parts.push(`Скан: ${scan}`);
    if (meds) parts.push(`ЛС: ${meds}`);

    if (!parts.length) continue;
    lines.push(`• ${parts.join(' · ')} (${formatDiaryDate(entry.createdAt)})`);
  }

  if (!lines.length) {
    return 'Записей «Триггер» с контекстом за период нет.';
  }

  return lines.join('\n');
}
