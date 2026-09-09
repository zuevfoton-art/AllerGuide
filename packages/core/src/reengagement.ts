import {
  addLocalDays,
  applyQuietHours,
  buildLocalDateTime,
  startOfLocalDay,
  type ScheduledReminderTrigger,
} from './reminder-policy';

export type ReturnStage = 'quick-checkin' | 'value' | 'reframe' | 'restart';

export const RETURN_QUICK_CHECKIN_DAYS = 3;
export const RETURN_VALUE_DAYS = 5;
export const RETURN_REFRAME_DAYS = 8;
export const RETURN_RESTART_DAYS = 14;
export const RETURN_MAX_PUSH_PER_STAGE = 1;
export const RETURN_MAX_PUSH_PER_WINDOW = 2;
export const RETURN_WINDOW_DAYS = 14;
export const RETURN_SILENCE_AFTER_IGNORED = 2;
/** App open within this many local days counts as “using the app” — no push. */
export const RETURN_RECENT_OPEN_DAYS = 2;

export function calendarDaysBetween(from: Date, to: Date): number {
  const start = startOfLocalDay(from).getTime();
  const end = startOfLocalDay(to).getTime();
  return Math.round((end - start) / 86_400_000);
}

export function latestDiaryTimestamp(
  entries: { createdAt: string }[],
): string | null {
  let latest: string | null = null;
  let latestMs = Number.NEGATIVE_INFINITY;
  for (const entry of entries) {
    const ms = Date.parse(entry.createdAt);
    if (!Number.isFinite(ms)) continue;
    if (ms > latestMs) {
      latestMs = ms;
      latest = entry.createdAt;
    }
  }
  return latest;
}

export function resolveReturnStage(input: {
  lastDiaryAt: string | null;
  now?: Date;
}): ReturnStage | null {
  if (!input.lastDiaryAt) return null;
  const parsed = Date.parse(input.lastDiaryAt);
  if (!Number.isFinite(parsed)) return null;
  const gap = calendarDaysBetween(new Date(parsed), input.now ?? new Date());
  if (gap < RETURN_QUICK_CHECKIN_DAYS) return null;
  if (gap >= RETURN_RESTART_DAYS) return 'restart';
  if (gap >= RETURN_REFRAME_DAYS) return 'reframe';
  if (gap >= RETURN_VALUE_DAYS) return 'value';
  return 'quick-checkin';
}

export type PlanReturnReminderInput = {
  lastDiaryAt: string | null;
  lastOpenedAt: string | null;
  returnPushCountInWindow: number;
  pushesByStage: Partial<Record<ReturnStage, number>>;
  ignoredStreak: number;
  valuePushOpened: boolean;
  now?: Date;
  reminderHour: number;
  reminderMinute: number;
  quietStart?: number;
  quietEnd?: number;
  profileId?: number;
};

function hasRecentAppOpen(lastOpenedAt: string | null, now: Date): boolean {
  if (!lastOpenedAt) return false;
  const parsed = Date.parse(lastOpenedAt);
  if (!Number.isFinite(parsed)) return false;
  return calendarDaysBetween(new Date(parsed), now) < RETURN_RECENT_OPEN_DAYS;
}

function nextQuietReminderAt(
  now: Date,
  hour: number,
  minute: number,
  quietStart?: number,
  quietEnd?: number,
): Date {
  const quiet = applyQuietHours(hour, minute, quietStart, quietEnd);
  let at = buildLocalDateTime(now, quiet.hour, quiet.minute);
  if (at.getTime() <= now.getTime()) {
    at = buildLocalDateTime(addLocalDays(now, 1), quiet.hour, quiet.minute);
  }
  return at;
}

/**
 * Re-engagement push for a diary gap. No extra push on quick-checkin or restart.
 * Push only when the user also has not opened the app recently.
 */
export function planReturnReminder(input: PlanReturnReminderInput): ScheduledReminderTrigger | null {
  const now = input.now ?? new Date();
  const stage = resolveReturnStage({ lastDiaryAt: input.lastDiaryAt, now });
  if (stage !== 'value' && stage !== 'reframe') return null;
  if (input.ignoredStreak >= RETURN_SILENCE_AFTER_IGNORED) return null;
  if (input.returnPushCountInWindow >= RETURN_MAX_PUSH_PER_WINDOW) return null;
  if ((input.pushesByStage[stage] ?? 0) >= RETURN_MAX_PUSH_PER_STAGE) return null;
  if (hasRecentAppOpen(input.lastOpenedAt, now)) return null;
  if (stage === 'reframe' && !input.valuePushOpened) return null;

  return {
    at: nextQuietReminderAt(
      now,
      input.reminderHour,
      input.reminderMinute,
      input.quietStart,
      input.quietEnd,
    ),
    kind: 'diary-return',
    profileId: input.profileId,
  };
}
