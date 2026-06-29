import type { AllergyConditionId } from './allergy-conditions';
import { decodeDiaryDetails } from './diary';
import { isActPromptDue } from './diary-profile';

export const DEFAULT_QUIET_HOURS_START = 22;
export const DEFAULT_QUIET_HOURS_END = 8;
export const DEFAULT_ACT_REMINDER_HOUR = 9;
export const DEFAULT_ACT_REMINDER_MINUTE = 0;
export const DEFAULT_VISIT_REMINDER_HOUR = 9;
export const DEFAULT_EPI_REMINDER_HOUR = 10;
export const VISIT_REMINDER_LEAD_DAYS = [1, 0] as const;
export const EPI_EXPIRY_LEAD_DAYS = [30, 7] as const;

export type DiaryEntryLike = {
  profileId?: number;
  type: string;
  details: string;
  createdAt: string;
};

export type ScheduledReminderTrigger = {
  at: Date;
  kind: 'diary' | 'act' | 'doctor-visit' | 'epinephrine-expiry' | 'pollen';
  profileId?: number;
  entryId?: number;
  scaleId?: string;
  visitLabel?: string;
  pollenLabel?: string;
  pollenLevel?: 'mid' | 'high';
};

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function hasDiaryEntryOnDate(entries: DiaryEntryLike[], day: Date, now = new Date()): boolean {
  const target = startOfLocalDay(day).getTime();
  return entries.some((entry) => startOfLocalDay(new Date(entry.createdAt)).getTime() === target);
}

export function isWithinQuietHours(
  hour: number,
  minute: number,
  quietStart = DEFAULT_QUIET_HOURS_START,
  quietEnd = DEFAULT_QUIET_HOURS_END,
): boolean {
  const total = hour * 60 + minute;
  const start = quietStart * 60;
  const end = quietEnd * 60;
  if (quietStart === quietEnd) return false;
  if (quietStart < quietEnd) {
    return total >= start && total < end;
  }
  return total >= start || total < end;
}

export function applyQuietHours(
  hour: number,
  minute: number,
  quietStart = DEFAULT_QUIET_HOURS_START,
  quietEnd = DEFAULT_QUIET_HOURS_END,
): { hour: number; minute: number } {
  if (!isWithinQuietHours(hour, minute, quietStart, quietEnd)) {
    return { hour, minute };
  }
  return { hour: quietEnd, minute: 0 };
}

export function buildLocalDateTime(day: Date, hour: number, minute: number): Date {
  const next = startOfLocalDay(day);
  next.setHours(hour, minute, 0, 0);
  return next;
}

export function computeNextDiaryReminderAt(
  entries: DiaryEntryLike[],
  hour: number,
  minute: number,
  now = new Date(),
  quietHours?: { start: number; end: number },
): Date {
  const adjusted = quietHours
    ? applyQuietHours(hour, minute, quietHours.start, quietHours.end)
    : { hour, minute };

  const today = startOfLocalDay(now);
  if (!hasDiaryEntryOnDate(entries, today, now)) {
    const todayAt = buildLocalDateTime(today, adjusted.hour, adjusted.minute);
    if (todayAt.getTime() > now.getTime()) {
      return todayAt;
    }
  }

  const tomorrow = addLocalDays(today, 1);
  return buildLocalDateTime(tomorrow, adjusted.hour, adjusted.minute);
}

export function shouldScheduleActReminder(
  entries: DiaryEntryLike[],
  conditions: AllergyConditionId[],
): boolean {
  return isActPromptDue(entries, conditions);
}

export function parseFlexibleDateTime(raw: string, now = new Date()): Date | null {
  const text = raw.trim();
  if (!text) return null;

  const iso = Date.parse(text);
  if (!Number.isNaN(iso)) {
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const dotted = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (dotted) {
    const day = Number(dotted[1]);
    const month = Number(dotted[2]) - 1;
    let year = Number(dotted[3]);
    if (year < 100) year += 2000;
    const hour = dotted[4] != null ? Number(dotted[4]) : 9;
    const minute = dotted[5] != null ? Number(dotted[5]) : 0;
    const parsed = new Date(year, month, day, hour, minute, 0, 0);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const dashed = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (dashed) {
    const year = Number(dashed[1]);
    const month = Number(dashed[2]) - 1;
    const day = Number(dashed[3]);
    const hour = dashed[4] != null ? Number(dashed[4]) : 9;
    const minute = dashed[5] != null ? Number(dashed[5]) : 0;
    const parsed = new Date(year, month, day, hour, minute, 0, 0);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  void now;
  return null;
}

export function parseEpinephrineExpiryDate(raw: string | undefined): Date | null {
  if (!raw?.trim()) return null;
  const monthMatch = raw.trim().match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]);
    return new Date(year, month, 0, 12, 0, 0, 0);
  }
  return parseFlexibleDateTime(raw);
}

export function collectDoctorVisitReminders(
  entries: DiaryEntryLike[],
  now = new Date(),
  leadDays: readonly number[] = VISIT_REMINDER_LEAD_DAYS,
  reminderHour = DEFAULT_VISIT_REMINDER_HOUR,
): ScheduledReminderTrigger[] {
  const reminders: ScheduledReminderTrigger[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (entry.type !== 'Визит к врачу') continue;
    const payload = decodeDiaryDetails(entry.details);
    if (!payload) continue;
    const visitRaw = payload.answers.visitDate?.trim();
    if (!visitRaw) continue;

    const visitAt = parseFlexibleDateTime(visitRaw, now);
    if (!visitAt || visitAt.getTime() <= now.getTime()) continue;

    const doctorType = payload.answers.visitDoctorType?.trim() || 'Визит к врачу';
    for (const lead of leadDays) {
      const triggerDay = addLocalDays(startOfLocalDay(visitAt), -lead);
      const at = buildLocalDateTime(triggerDay, reminderHour, 0);
      if (at.getTime() <= now.getTime()) continue;
      const key = `${entry.profileId ?? 0}:${at.toISOString()}:${doctorType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      reminders.push({
        at,
        kind: 'doctor-visit',
        profileId: entry.profileId,
        entryId: (entry as { id?: number }).id,
        visitLabel: doctorType,
      });
    }
  }

  return reminders.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function collectEpinephrineExpiryReminders(
  profileId: number,
  expiryRaw: string | undefined,
  now = new Date(),
  leadDays: readonly number[] = EPI_EXPIRY_LEAD_DAYS,
  reminderHour = DEFAULT_EPI_REMINDER_HOUR,
): ScheduledReminderTrigger[] {
  const expiryAt = parseEpinephrineExpiryDate(expiryRaw);
  if (!expiryAt) return [];

  const reminders: ScheduledReminderTrigger[] = [];
  for (const lead of leadDays) {
    const triggerDay = addLocalDays(startOfLocalDay(expiryAt), -lead);
    const at = buildLocalDateTime(triggerDay, reminderHour, 0);
    if (at.getTime() <= now.getTime()) continue;
    reminders.push({
      at,
      kind: 'epinephrine-expiry',
      profileId,
    });
  }
  return reminders;
}

export function collectActReminderTriggers(
  profileId: number,
  entries: DiaryEntryLike[],
  conditions: AllergyConditionId[],
  now = new Date(),
  hour = DEFAULT_ACT_REMINDER_HOUR,
  minute = DEFAULT_ACT_REMINDER_MINUTE,
): ScheduledReminderTrigger[] {
  if (!shouldScheduleActReminder(entries, conditions)) return [];

  const today = startOfLocalDay(now);
  const at = buildLocalDateTime(today, hour, minute);
  const scheduledAt = at.getTime() > now.getTime() ? at : buildLocalDateTime(addLocalDays(today, 1), hour, minute);

  return [
    {
      at: scheduledAt,
      kind: 'act',
      profileId,
      scaleId: 'act',
    },
  ];
}

export function limitRemindersPerDay(
  reminders: ScheduledReminderTrigger[],
  maxPerDay: number,
): ScheduledReminderTrigger[] {
  if (maxPerDay <= 0) return [];
  const perDay = new Map<string, number>();
  const kept: ScheduledReminderTrigger[] = [];

  const priority: Record<ScheduledReminderTrigger['kind'], number> = {
    'epinephrine-expiry': 0,
    act: 1,
    'doctor-visit': 2,
    pollen: 3,
    diary: 4,
  };

  const sorted = [...reminders].sort((a, b) => {
    const dayDiff = startOfLocalDay(a.at).getTime() - startOfLocalDay(b.at).getTime();
    if (dayDiff !== 0) return dayDiff;
    return priority[a.kind] - priority[b.kind];
  });

  for (const reminder of sorted) {
    const key = startOfLocalDay(reminder.at).toISOString();
    const count = perDay.get(key) ?? 0;
    if (count >= maxPerDay) continue;
    perDay.set(key, count + 1);
    kept.push(reminder);
  }

  return kept;
}
