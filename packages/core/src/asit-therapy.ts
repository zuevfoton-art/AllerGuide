import { decodeDiaryDetails } from './diary';

export type AsitRoute = 'slit' | 'scit';
export type AsitPhase = 'buildup' | 'maintenance';

export interface AsitCourse {
  v: 1;
  active: boolean;
  allergen: string;
  drug: string;
  route: AsitRoute;
  phase: AsitPhase;
  startDate: string;
  scheduleNotes: string;
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

export function isAsitCourseConfigured(course: AsitCourse | null): course is AsitCourse {
  return Boolean(course?.active && course.drug.trim() && course.allergen.trim());
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
