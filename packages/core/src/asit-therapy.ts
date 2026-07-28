import { decodeDiaryDetails } from './diary';

export type AsitRoute = 'slit' | 'scit';
export type AsitPhase = 'buildup' | 'maintenance';

export interface AsitScheduleStage {
  from: string;
  to: string;
  dose: string;
}

export interface AsitCourse {
  v: 1;
  active: boolean;
  /** Display name of the allergen (free text or resolved from catalog). */
  allergen: string;
  /** Canonical allergen id from catalog, if chosen via picker. */
  allergenId?: string;
  drug: string;
  route: AsitRoute;
  phase: AsitPhase;
  /** ISO date string YYYY-MM-DD. */
  startDate: string;
  scheduleNotes: string;
  /** Structured schedule stages parsed from prescription OCR. */
  scheduleStages?: AsitScheduleStage[];
  /** URI of prescription photo attached by user. */
  prescriptionPhotoUri?: string;
  /** URI of prescription PDF document attached by user. */
  prescriptionDocUri?: string;
  /** User has reviewed and confirmed the schedule stages. */
  verified?: boolean;
  /** Course is active and reminders are live. */
  activated?: boolean;
  reminderHour?: number;
  reminderMinute?: number;
}

export const ASIT_ROUTE_LABELS: Record<AsitRoute, string> = {
  slit: 'Подъязычная (SLIT)',
  scit: 'Подкожная (SCIT)',
};

export const ASIT_PHASE_LABELS: Record<AsitPhase, string> = {
  buildup: 'Наращивание дозы',
  maintenance: 'Поддерживающая терапия',
};

export const ASIT_ON_SCHEDULE_CHOICES = ['В срок', 'С опозданием', 'Пропущена'] as const;
export const ASIT_LOCAL_REACTION_CHOICES = ['Нет', 'Покраснение', 'Отёк', 'Зуд', 'Другое'] as const;
export const ASIT_SYSTEMIC_REACTION_CHOICES = [
  'Нет реакции',
  'Лёгкая',
  'Умеренная',
  'Сильная',
] as const;

export const ASIT_DISCLAIMER =
  'АСИТ назначается только врачом. Приложение фиксирует приёмы и реакции, но не корректирует дозировки и схему.';

export const DEFAULT_ASIT_REMINDER_HOUR = 8;
export const DEFAULT_ASIT_REMINDER_MINUTE = 0;

export function isAsitReminderConfigured(course: AsitCourse | null): boolean {
  if (!course?.active) return false;
  return typeof course.reminderHour === 'number' && course.reminderHour >= 0 && course.reminderHour <= 23;
}

export function formatAsitReminderTime(hour: number, minute = 0): string {
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');
  return `${h}:${m}`;
}

export function buildAsitReminderContent(course: AsitCourse): { title: string; body: string } {
  const drug = course.drug.trim() || 'препарат';
  return {
    title: 'Напоминание АСИТ',
    body: `Время приёма: ${drug} (${course.allergen.trim() || 'курс АСИТ'})`,
  };
}

export function createDefaultAsitCourse(): AsitCourse {
  return {
    v: 1,
    active: true,
    allergen: '',
    drug: '',
    route: 'slit',
    phase: 'buildup',
    startDate: '',
    scheduleNotes: '',
    activated: false,
    verified: false,
  };
}

export function parseAsitCourse(raw: string | null | undefined): AsitCourse | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as AsitCourse;
    if (parsed?.v !== 1) return null;
    if (!parsed.route || !parsed.phase) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function serializeAsitCourse(course: AsitCourse): string {
  return JSON.stringify(course);
}

/**
 * Course is ready for diary logging when drug+allergen are set and the user
 * confirmed the final review (`activated`). Legacy courses without the flag
 * stay configured if they were already active.
 */
export function isAsitCourseConfigured(course: AsitCourse | null): course is AsitCourse {
  if (!course?.active || !course.drug.trim() || !course.allergen.trim()) return false;
  if (course.activated === false) return false;
  return true;
}

function parseIsoDateOnly(value: string): Date | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Estimates the sequential dose number from course start + existing logs.
 * When schedule stages exist, advances by calendar days since start (1 dose/day
 * heuristic for SLIT-style courses); otherwise uses existingDoseCount + 1.
 * Manual override remains available in the diary wizard.
 */
export function computeAsitDoseNumber(
  course: AsitCourse,
  existingDoseCount: number,
  asOf: Date = new Date(),
): number | null {
  if (!course.startDate?.trim()) return null;

  const start = parseIsoDateOnly(course.startDate);
  if (!start) return existingDoseCount + 1;

  const stages = course.scheduleStages?.filter((s) => s.from && s.to) ?? [];
  if (stages.length > 0) {
    const dayMs = 86_400_000;
    const daysSinceStart = Math.floor((asOf.getTime() - start.getTime()) / dayMs);
    if (daysSinceStart < 0) return 1;
    // Prefer logged count when user started mid-course; otherwise calendar-based.
    return Math.max(existingDoseCount + 1, daysSinceStart + 1);
  }

  return existingDoseCount + 1;
}

/**
 * Returns an answers prefill that includes auto-generated doseNumber when
 * a course is configured, so the diary wizard can surface it.
 */
export function buildAsitPrefillWithDoseNumber(
  course: AsitCourse,
  existingDoseCount: number,
): Record<string, string> {
  const base = buildAsitPrefill(course);
  const doseNum = computeAsitDoseNumber(course, existingDoseCount);
  if (doseNum !== null) {
    base.asitDoseNumber = `${doseNum}-й приём`;
  }
  return base;
}

export function buildAsitPrefill(course: AsitCourse): Record<string, string> {
  return {
    asitAllergen: course.allergen,
    asitDrug: course.drug,
    asitRoute: ASIT_ROUTE_LABELS[course.route],
    asitPhase: ASIT_PHASE_LABELS[course.phase],
    asitSchedule: course.scheduleNotes,
  };
}

/**
 * Step ids shown to the user when a course is already configured.
 * Allergen, drug, route, phase, and schedule are pre-filled and skipped.
 */
export const ASIT_SIMPLIFIED_STEP_IDS = [
  'asitTakenAt',
  'asitDoseNumber',
  'asitOnSchedule',
  'asitLocalReaction',
  'asitReaction',
  'asitComment',
] as const;

export function formatAsitSummary(answers: Record<string, string>): string {
  const parts: string[] = [];
  const drug = answers.asitDrug?.trim();
  const allergen = answers.asitAllergen?.trim();
  const takenAt = answers.asitTakenAt?.trim();
  const reaction = answers.asitReaction?.trim();
  const onSchedule = answers.asitOnSchedule?.trim();
  const local = answers.asitLocalReaction?.trim();

  if (drug) parts.push(drug);
  if (allergen) parts.push(allergen);
  if (takenAt) parts.push(takenAt);
  if (onSchedule) parts.push(onSchedule);
  if (reaction) parts.push(`реакция: ${reaction}`);
  else if (local && local !== 'Нет') parts.push(`местная: ${local}`);

  return parts.length ? parts.join(' · ') : 'Приём АСИТ';
}

export interface AsitComplianceSummary {
  totalDoses: number;
  onTime: number;
  delayed: number;
  missed: number;
  reactions: { none: number; mild: number; moderate: number; severe: number };
  lastDoseAt: string | null;
  lastReaction: string | null;
}

function mapSystemicReaction(value: string | undefined): keyof AsitComplianceSummary['reactions'] {
  const normalized = value?.trim() ?? '';
  if (!normalized || normalized === 'Нет реакции') return 'none';
  if (normalized === 'Лёгкая') return 'mild';
  if (normalized === 'Умеренная') return 'moderate';
  return 'severe';
}

export function computeAsitCompliance(
  entries: { type: string; details: string; createdAt: string }[],
  periodDays = 30,
): AsitComplianceSummary {
  const cutoff = Date.now() - periodDays * 86_400_000;
  const summary: AsitComplianceSummary = {
    totalDoses: 0,
    onTime: 0,
    delayed: 0,
    missed: 0,
    reactions: { none: 0, mild: 0, moderate: 0, severe: 0 },
    lastDoseAt: null,
    lastReaction: null,
  };

  for (const entry of entries) {
    if (entry.type !== 'АСИТ') continue;
    if (new Date(entry.createdAt).getTime() < cutoff) continue;

    const payload = decodeDiaryDetails(entry.details);
    if (!payload) continue;

    summary.totalDoses += 1;
    const schedule = payload.answers.asitOnSchedule?.trim();
    if (schedule === 'В срок') summary.onTime += 1;
    else if (schedule === 'С опозданием') summary.delayed += 1;
    else if (schedule === 'Пропущена') summary.missed += 1;

    const reactionKey = mapSystemicReaction(payload.answers.asitReaction);
    summary.reactions[reactionKey] += 1;

    if (!summary.lastDoseAt) {
      summary.lastDoseAt = entry.createdAt;
      summary.lastReaction = payload.answers.asitReaction?.trim() || null;
    }
  }

  return summary;
}

export function formatAsitReportSummary(
  summary: AsitComplianceSummary,
  course: AsitCourse | null,
  periodDays = 30,
): string {
  const lines: string[] = [`Период: ${periodDays} дней.`];

  if (course && isAsitCourseConfigured(course)) {
    lines.push(
      `Курс: ${course.drug} · ${course.allergen} · ${ASIT_ROUTE_LABELS[course.route]} · ${ASIT_PHASE_LABELS[course.phase]}.`,
    );
    if (course.scheduleNotes.trim()) {
      lines.push(`Схема (по словам врача): ${course.scheduleNotes.trim()}`);
    }
    if (course.scheduleStages?.length) {
      const stageSummary = course.scheduleStages
        .map((s) => `${s.from}–${s.to}: ${s.dose}`)
        .join('; ');
      lines.push(`Этапы: ${stageSummary}`);
    }
  }

  if (!summary.totalDoses) {
    lines.push('Записей о приёме АСИТ за период нет.');
    return lines.join('\n');
  }

  lines.push(`Приёмов: ${summary.totalDoses} (в срок: ${summary.onTime}, с опозданием: ${summary.delayed}, пропущено: ${summary.missed}).`);
  lines.push(
    `Системные реакции: нет — ${summary.reactions.none}, лёгкие — ${summary.reactions.mild}, умеренные — ${summary.reactions.moderate}, сильные — ${summary.reactions.severe}.`,
  );

  if (summary.lastReaction) {
    lines.push(`Последняя зафиксированная реакция: ${summary.lastReaction}.`);
  }

  return lines.join('\n');
}
