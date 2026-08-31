import { decodeDiaryDetails } from './diary';

export type PrescribedTherapyRoute = 'oral' | 'inhaled' | 'nasal' | 'topical' | 'injection' | 'other';
export type PrescribedDoseStatus = 'on-time' | 'late' | 'missed';

export const PRESCRIBED_THERAPY_ROUTE_LABELS: Record<PrescribedTherapyRoute, string> = {
  oral: 'Пероральный',
  inhaled: 'Ингаляционный',
  nasal: 'Интраназальный',
  topical: 'Местный (наружный)',
  injection: 'Инъекционный',
  other: 'Другой',
};

export interface PrescribedTherapyStage {
  from: string;
  to: string;
  dose: string;
}

export interface PrescribedReminderTime {
  hour: number;
  minute: number;
}

export interface PrescribedCourse {
  v: 1;
  active: boolean;
  /** Free-text drug name as on the prescription. */
  drug: string;
  dosage: string;
  route: PrescribedTherapyRoute;
  /** ISO date YYYY-MM-DD */
  startDate: string;
  /** ISO date YYYY-MM-DD */
  endDate: string;
  scheduleNotes: string;
  /** Multi-row «схема приёма»; preferred over a single multiline notes blob. */
  scheduleLines?: string[];
  stages?: PrescribedTherapyStage[];
  prescriptionPhotoUri?: string;
  prescriptionDocUri?: string;
  verified?: boolean;
  activated?: boolean;
  notes: string;
  /**
   * Daily reminder times (multi-dose). Preferred over legacy single hour/minute.
   * When set, `reminderHour` / `reminderMinute` mirror the first entry for older clients.
   */
  reminderTimes?: PrescribedReminderTime[];
  /** @deprecated Prefer `reminderTimes`; kept for backward-compatible storage. */
  reminderHour?: number;
  /** @deprecated Prefer `reminderTimes`; kept for backward-compatible storage. */
  reminderMinute?: number;
}

/** Max daily reminder rows on the therapy review screen. */
export const MAX_PRESCRIBED_REMINDER_TIMES = 6;
export const DEFAULT_PRESCRIBED_REMINDER_HOUR = 8;
export const DEFAULT_PRESCRIBED_REMINDER_MINUTE = 0;

export const PRESCRIBED_THERAPY_DOSE_STATUS_LABELS: Record<PrescribedDoseStatus, string> = {
  'on-time': 'В срок',
  late: 'С опозданием',
  missed: 'Пропущена',
};

export function createDefaultPrescribedCourse(): PrescribedCourse {
  return {
    v: 1,
    active: true,
    drug: '',
    dosage: '',
    route: 'oral',
    startDate: '',
    endDate: '',
    scheduleNotes: '',
    scheduleLines: [''],
    notes: '',
    activated: false,
    verified: false,
  };
}

export function parsePrescribedCourse(raw: string | null | undefined): PrescribedCourse | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as PrescribedCourse;
    if (parsed?.v !== 1) return null;
    if (!parsed.drug && !parsed.dosage) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function serializePrescribedCourse(course: PrescribedCourse): string {
  return JSON.stringify(course);
}

/** Ready for diary logging after final review confirm (`activated`). Legacy without flag stays ok. */
export function isPrescribedCourseConfigured(course: PrescribedCourse | null): course is PrescribedCourse {
  if (!course?.active || !course.drug.trim()) return false;
  if (course.activated === false) return false;
  return true;
}

function clampReminderHour(value: number): number {
  return Math.min(23, Math.max(0, Math.trunc(value)));
}

function clampReminderMinute(value: number): number {
  return Math.min(59, Math.max(0, Math.trunc(value)));
}

function isValidReminderTime(time: PrescribedReminderTime | null | undefined): time is PrescribedReminderTime {
  return (
    typeof time?.hour === 'number' &&
    Number.isFinite(time.hour) &&
    time.hour >= 0 &&
    time.hour <= 23 &&
    typeof time.minute === 'number' &&
    Number.isFinite(time.minute) &&
    time.minute >= 0 &&
    time.minute <= 59
  );
}

/** Normalize, dedupe, sort, and cap reminder times. */
export function normalizePrescribedReminderTimes(
  times: PrescribedReminderTime[] | null | undefined,
): PrescribedReminderTime[] {
  if (!times?.length) return [];
  const seen = new Set<string>();
  const normalized: PrescribedReminderTime[] = [];
  for (const time of times) {
    if (!isValidReminderTime(time)) continue;
    const hour = clampReminderHour(time.hour);
    const minute = clampReminderMinute(time.minute);
    const key = `${hour}:${minute}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({ hour, minute });
    if (normalized.length >= MAX_PRESCRIBED_REMINDER_TIMES) break;
  }
  return normalized.sort((a, b) => a.hour - b.hour || a.minute - b.minute);
}

/**
 * Resolve configured reminder times, including legacy single hour/minute fields.
 */
export function getPrescribedReminderTimes(course: PrescribedCourse | null): PrescribedReminderTime[] {
  if (!course?.active) return [];
  if (course.reminderTimes?.length) {
    return normalizePrescribedReminderTimes(course.reminderTimes);
  }
  if (typeof course.reminderHour === 'number' && course.reminderHour >= 0 && course.reminderHour <= 23) {
    return [
      {
        hour: clampReminderHour(course.reminderHour),
        minute: clampReminderMinute(course.reminderMinute ?? DEFAULT_PRESCRIBED_REMINDER_MINUTE),
      },
    ];
  }
  return [];
}

export function applyPrescribedReminderTimes(
  course: PrescribedCourse,
  times: PrescribedReminderTime[],
): PrescribedCourse {
  const normalized = normalizePrescribedReminderTimes(times);
  if (!normalized.length) {
    const next = { ...course };
    delete next.reminderTimes;
    delete next.reminderHour;
    delete next.reminderMinute;
    return next;
  }
  return {
    ...course,
    reminderTimes: normalized,
    reminderHour: normalized[0].hour,
    reminderMinute: normalized[0].minute,
  };
}

export function setPrescribedReminderEnabled(
  course: PrescribedCourse,
  enabled: boolean,
): PrescribedCourse {
  if (!enabled) return applyPrescribedReminderTimes(course, []);
  const existing = getPrescribedReminderTimes({ ...course, active: true });
  if (existing.length) return applyPrescribedReminderTimes(course, existing);
  return applyPrescribedReminderTimes(course, [
    {
      hour: DEFAULT_PRESCRIBED_REMINDER_HOUR,
      minute: DEFAULT_PRESCRIBED_REMINDER_MINUTE,
    },
  ]);
}

export function addPrescribedReminderTime(course: PrescribedCourse): PrescribedCourse {
  const times = getPrescribedReminderTimes({ ...course, active: true });
  if (times.length >= MAX_PRESCRIBED_REMINDER_TIMES) return course;
  const last = times[times.length - 1] ?? {
    hour: DEFAULT_PRESCRIBED_REMINDER_HOUR,
    minute: DEFAULT_PRESCRIBED_REMINDER_MINUTE,
  };
  return applyPrescribedReminderTimes(course, [
    ...times,
    { hour: (last.hour + 12) % 24, minute: last.minute },
  ]);
}

export function updatePrescribedReminderTimeAt(
  course: PrescribedCourse,
  index: number,
  patch: Partial<PrescribedReminderTime>,
): PrescribedCourse {
  const times = getPrescribedReminderTimes({ ...course, active: true });
  if (index < 0 || index >= times.length) return course;
  // Keep row order while typing — sort/dedupe happens on add/enable/save.
  const next = times.map((time, i) => {
    if (i !== index) return time;
    return {
      hour: patch.hour === undefined ? time.hour : clampReminderHour(patch.hour),
      minute: patch.minute === undefined ? time.minute : clampReminderMinute(patch.minute),
    };
  });
  return {
    ...course,
    reminderTimes: next,
    reminderHour: next[0]?.hour,
    reminderMinute: next[0]?.minute,
  };
}

export function removePrescribedReminderTimeAt(
  course: PrescribedCourse,
  index: number,
): PrescribedCourse {
  const times = getPrescribedReminderTimes({ ...course, active: true });
  if (times.length <= 1 || index < 0 || index >= times.length) return course;
  return applyPrescribedReminderTimes(
    course,
    times.filter((_, i) => i !== index),
  );
}

export function isPrescribedReminderConfigured(course: PrescribedCourse | null): boolean {
  return getPrescribedReminderTimes(course).length > 0;
}

export interface NextPrescribedIntake {
  at: Date;
  hour: number;
  minute: number;
}

function parseCourseDateBoundary(value: string, endOfDay: boolean): Date | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const boundary = new Date(year, month - 1, day);
  if (endOfDay) boundary.setHours(23, 59, 59, 999);
  else boundary.setHours(0, 0, 0, 0);
  return boundary;
}

/**
 * Next scheduled intake from reminder times. Respects course start/end dates.
 * Returns null when the course is inactive, has no times, or the window has ended.
 */
export function computeNextPrescribedIntake(
  course: PrescribedCourse | null,
  now: Date = new Date(),
): NextPrescribedIntake | null {
  if (!isPrescribedCourseConfigured(course)) return null;
  const times = getPrescribedReminderTimes(course);
  if (!times.length) return null;

  const start = course.startDate ? parseCourseDateBoundary(course.startDate, false) : null;
  const end = course.endDate ? parseCourseDateBoundary(course.endDate, true) : null;
  if (end && now.getTime() > end.getTime()) return null;

  const searchFrom = start && now.getTime() < start.getTime() ? start : now;

  for (let dayOffset = 0; dayOffset <= 1; dayOffset += 1) {
    for (const time of times) {
      const candidate = new Date(searchFrom);
      candidate.setDate(searchFrom.getDate() + dayOffset);
      candidate.setHours(time.hour, time.minute, 0, 0);
      if (candidate.getTime() <= now.getTime()) continue;
      if (end && candidate.getTime() > end.getTime()) continue;
      if (start && candidate.getTime() < start.getTime()) continue;
      return { at: candidate, hour: time.hour, minute: time.minute };
    }
  }

  return null;
}

export function formatPrescribedReminderTime(hour: number, minute = 0): string {
  const h = String(clampReminderHour(hour)).padStart(2, '0');
  const m = String(clampReminderMinute(minute)).padStart(2, '0');
  return `${h}:${m}`;
}

/** Comma-separated list for cards / summary lines. */
export function formatPrescribedReminderTimes(times: PrescribedReminderTime[]): string {
  return normalizePrescribedReminderTimes(times)
    .map((time) => formatPrescribedReminderTime(time.hour, time.minute))
    .join(', ');
}

export function buildPrescribedReminderContent(course: PrescribedCourse): {
  title: string;
  body: string;
} {
  const drug = course.drug.trim() || 'препарат';
  return {
    title: 'Напоминание о приёме',
    body: `Время приёма: ${drug}${course.dosage.trim() ? ` (${course.dosage.trim()})` : ''}`,
  };
}

/** Diary steps when a prescribed course is already configured. */
export const PRESCRIBED_SIMPLIFIED_STEP_IDS = [
  'therapyTakenAt',
  'therapyStatus',
  'therapyReaction',
  'therapyComment',
] as const;

export function normalizeTherapyDoseStatus(
  value: string | undefined,
): PrescribedDoseStatus | null {
  const normalized = value?.trim() ?? '';
  if (normalized === 'on-time' || normalized === 'В срок') return 'on-time';
  if (normalized === 'late' || normalized === 'С опозданием') return 'late';
  if (normalized === 'missed' || normalized === 'Пропущена') return 'missed';
  return null;
}

export interface PrescribedComplianceSummary {
  totalDoses: number;
  onTime: number;
  late: number;
  missed: number;
  reactions: number;
  lastDoseAt: string | null;
}

export function computePrescribedCompliance(
  entries: { type: string; details: string; createdAt: string }[],
  periodDays = 30,
): PrescribedComplianceSummary {
  const cutoff = Date.now() - periodDays * 86_400_000;
  const summary: PrescribedComplianceSummary = {
    totalDoses: 0,
    onTime: 0,
    late: 0,
    missed: 0,
    reactions: 0,
    lastDoseAt: null,
  };

  for (const entry of entries) {
    if (entry.type !== 'Терапия') continue;
    if (new Date(entry.createdAt).getTime() < cutoff) continue;

    const payload = decodeDiaryDetails(entry.details);
    if (!payload) continue;

    summary.totalDoses += 1;
    const status = normalizeTherapyDoseStatus(payload.answers.therapyStatus);
    if (status === 'on-time') summary.onTime += 1;
    else if (status === 'late') summary.late += 1;
    else if (status === 'missed') summary.missed += 1;

    const reaction = payload.answers.therapyReaction?.trim();
    if (reaction && reaction !== 'Нет') summary.reactions += 1;

    if (!summary.lastDoseAt) {
      summary.lastDoseAt = entry.createdAt;
    }
  }

  return summary;
}

export function buildPrescribedTherapyDiarySummary(answers: Record<string, string>): string {
  const parts: string[] = [];
  const drug = answers.therapyDrug?.trim();
  const status = answers.therapyStatus?.trim();
  const takenAt = answers.therapyTakenAt?.trim();
  const reaction = answers.therapyReaction?.trim();

  if (drug) parts.push(drug);
  if (takenAt) parts.push(takenAt);
  const statusKey = normalizeTherapyDoseStatus(status);
  if (statusKey) parts.push(PRESCRIBED_THERAPY_DOSE_STATUS_LABELS[statusKey]);
  else if (status) parts.push(status);
  if (reaction && reaction !== 'Нет') parts.push(`реакция: ${reaction}`);

  return parts.length ? parts.join(' · ') : 'Приём препарата';
}

export function buildPrescribedTherapyPrefill(course: PrescribedCourse): Record<string, string> {
  return {
    therapyDrug: course.drug,
    therapyDosage: course.dosage,
    therapyRoute: PRESCRIBED_THERAPY_ROUTE_LABELS[course.route],
    therapySchedule: course.scheduleNotes,
  };
}
