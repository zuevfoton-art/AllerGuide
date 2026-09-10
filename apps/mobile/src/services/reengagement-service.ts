import {
  calendarDaysBetween,
  encodeDiaryDetails,
  latestDiaryTimestamp,
  planReturnReminder,
  resolveReturnStage,
  RETURN_WINDOW_DAYS,
  SEVERITY_0_3_CHOICES,
  type ReturnStage,
  type ScheduledReminderTrigger,
} from '@allerguide/core';
import { addDiaryEntries, listAllDiaryEntries } from '@/src/services/diary-service';
import { getSetting, setSetting } from '@/src/services/settings-service';
import { trackEvent } from '@/src/services/analytics-service';
import { getOrLoadActiveProfileId } from '@/src/services/profile-service';

const KEY = {
  lastOpenedAt: 'returnLastOpenedAt',
  pushCount: 'returnPushCount',
  pushLastAt: 'returnPushLastAt',
  pushLastStage: 'returnPushLastStage',
  ignoredStreak: 'returnPushIgnoredStreak',
  valueOpened: 'returnValuePushOpened',
  pushesByStage: 'returnPushesByStage',
  windowStart: 'returnPushWindowStart',
} as const;

function parseCount(value: string | null): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseStageMap(raw: string | null): Partial<Record<ReturnStage, number>> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Partial<Record<ReturnStage, number>>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function markAppOpened(now = new Date()): void {
  setSetting(KEY.lastOpenedAt, now.toISOString());
  const lastPush = getSetting(KEY.pushLastAt);
  if (!lastPush) return;
  const lastPushMs = Date.parse(lastPush);
  if (!Number.isFinite(lastPushMs)) return;
  if (calendarDaysBetween(new Date(lastPushMs), now) > 1) return;
  setSetting(KEY.ignoredStreak, '0');
  if (getSetting(KEY.pushLastStage) === 'value') {
    setSetting(KEY.valueOpened, 'true');
  }
}

export function resetReturnEpisode(): void {
  setSetting(KEY.pushCount, '0');
  setSetting(KEY.pushLastAt, '');
  setSetting(KEY.pushLastStage, '');
  setSetting(KEY.ignoredStreak, '0');
  setSetting(KEY.valueOpened, 'false');
  setSetting(KEY.pushesByStage, '{}');
  setSetting(KEY.windowStart, '');
}

function maybeResetWindow(now: Date): void {
  const start = getSetting(KEY.windowStart);
  if (!start) {
    setSetting(KEY.windowStart, now.toISOString());
    return;
  }
  const startMs = Date.parse(start);
  if (!Number.isFinite(startMs) || calendarDaysBetween(new Date(startMs), now) >= RETURN_WINDOW_DAYS) {
    setSetting(KEY.windowStart, now.toISOString());
    setSetting(KEY.pushCount, '0');
    setSetting(KEY.pushesByStage, '{}');
  }
}

function diaryEntriesForProfile(profileId: number): { createdAt: string }[] {
  return listAllDiaryEntries().filter((entry) => entry.profileId === profileId);
}

export function resolveActiveReturnStage(now = new Date()): ReturnStage | null {
  const profileId = getOrLoadActiveProfileId();
  if (!profileId) return null;
  return resolveReturnStage({
    lastDiaryAt: latestDiaryTimestamp(diaryEntriesForProfile(profileId)),
    now,
  });
}

export function planActiveReturnReminder(input: {
  reminderHour: number;
  reminderMinute: number;
  now?: Date;
  profileId?: number;
}): ScheduledReminderTrigger | null {
  const now = input.now ?? new Date();
  const profileId = input.profileId ?? getOrLoadActiveProfileId() ?? undefined;
  if (!profileId) return null;
  maybeResetWindow(now);

  const entries = diaryEntriesForProfile(profileId);
  const lastDiaryAt = latestDiaryTimestamp(entries);
  if (lastDiaryAt && calendarDaysBetween(new Date(lastDiaryAt), now) < 1) {
    resetReturnEpisode();
  }

  return planReturnReminder({
    lastDiaryAt,
    lastOpenedAt: getSetting(KEY.lastOpenedAt),
    returnPushCountInWindow: parseCount(getSetting(KEY.pushCount)),
    pushesByStage: parseStageMap(getSetting(KEY.pushesByStage)),
    ignoredStreak: parseCount(getSetting(KEY.ignoredStreak)),
    valuePushOpened: getSetting(KEY.valueOpened) === 'true',
    now,
    reminderHour: input.reminderHour,
    reminderMinute: input.reminderMinute,
    profileId,
  });
}

export function recordReturnPushScheduled(stage: ReturnStage, at: Date): void {
  const count = parseCount(getSetting(KEY.pushCount)) + 1;
  setSetting(KEY.pushCount, String(count));
  setSetting(KEY.pushLastAt, at.toISOString());
  setSetting(KEY.pushLastStage, stage);
  const byStage = parseStageMap(getSetting(KEY.pushesByStage));
  byStage[stage] = (byStage[stage] ?? 0) + 1;
  setSetting(KEY.pushesByStage, JSON.stringify(byStage));
  setSetting(KEY.ignoredStreak, String(parseCount(getSetting(KEY.ignoredStreak)) + 1));
}

export async function saveQuickCheckIn(
  profileId: number,
  severity: 0 | 1 | 2 | 3,
): Promise<{ ok: boolean }> {
  const details = encodeDiaryDetails({ severity0_3: SEVERITY_0_3_CHOICES[severity] }, 'Симптомы');
  const results = await addDiaryEntries(profileId, [{ type: 'Симптомы', details }]);
  const failed = results.find((result) => !result.ok);
  if (failed) return { ok: false };
  resetReturnEpisode();
  trackEvent('reengagement_action', { stage: 'quick-checkin', action: 'checkin' });
  return { ok: true };
}

export function trackReturnShown(stage: ReturnStage, gapDays: number, surface: string): void {
  trackEvent('reengagement_shown', { stage, gap_days: gapDays, surface });
}

export function trackReturnAction(stage: ReturnStage, action: string): void {
  trackEvent('reengagement_action', { stage, action });
}
