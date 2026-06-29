export const DEFAULT_DIARY_REMINDER_HOUR = 20;
export const DEFAULT_DIARY_REMINDER_MINUTE = 0;

export const DIARY_REMINDER_HOUR_KEY = 'diaryReminderHour';
export const DIARY_REMINDER_MINUTE_KEY = 'diaryReminderMinute';

export function clampReminderHour(hour: number): number {
  if (!Number.isFinite(hour)) return DEFAULT_DIARY_REMINDER_HOUR;
  return Math.min(23, Math.max(0, Math.trunc(hour)));
}

export function clampReminderMinute(minute: number): number {
  if (!Number.isFinite(minute)) return DEFAULT_DIARY_REMINDER_MINUTE;
  return Math.min(59, Math.max(0, Math.trunc(minute)));
}

export function parseReminderHour(raw: string | null | undefined, fallback = DEFAULT_DIARY_REMINDER_HOUR): number {
  if (raw == null || raw.trim() === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return clampReminderHour(parsed);
}

export function parseReminderMinute(
  raw: string | null | undefined,
  fallback = DEFAULT_DIARY_REMINDER_MINUTE,
): number {
  if (raw == null || raw.trim() === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return clampReminderMinute(parsed);
}

export function formatReminderClock(hour: number, minute = 0): string {
  const h = String(clampReminderHour(hour)).padStart(2, '0');
  const m = String(clampReminderMinute(minute)).padStart(2, '0');
  return `${h}:${m}`;
}

export interface ReminderNotificationContent {
  title: string;
  body: string;
}
