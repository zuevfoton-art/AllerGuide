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
  reminderHour?: number;
  reminderMinute?: number;
}

export const PRESCRIBED_THERAPY_DOSE_STATUS_LABELS: Record<PrescribedDoseStatus, string> = {
  'on-time': 'В срок',
  late: 'С опозданием',
  missed: 'Пропущена',
};

export const PRESCRIBED_THERAPY_DISCLAIMER =
  'Терапия назначается только врачом. Приложение фиксирует приёмы, но не корректирует дозировки и схему.';

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

export function isPrescribedReminderConfigured(course: PrescribedCourse | null): boolean {
  if (!course?.active) return false;
  return typeof course.reminderHour === 'number' && course.reminderHour >= 0 && course.reminderHour <= 23;
}

export function formatPrescribedReminderTime(hour: number, minute = 0): string {
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');
  return `${h}:${m}`;
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
