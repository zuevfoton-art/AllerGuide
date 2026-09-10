import { describe, expect, it } from 'vitest';
import {
  RETURN_SILENCE_AFTER_IGNORED,
  calendarDaysBetween,
  latestDiaryTimestamp,
  planReturnReminder,
  resolveReturnStage,
} from './reengagement';
import { limitRemindersPerDay } from './reminder-policy';

const noon = new Date(2026, 6, 20, 12, 0, 0);

function daysAgo(days: number, base = noon): string {
  const d = new Date(base);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

describe('resolveReturnStage', () => {
  it.each([
    { gap: 0, stage: null },
    { gap: 2, stage: null },
    { gap: 3, stage: 'quick-checkin' },
    { gap: 4, stage: 'quick-checkin' },
    { gap: 5, stage: 'value' },
    { gap: 7, stage: 'value' },
    { gap: 8, stage: 'reframe' },
    { gap: 13, stage: 'reframe' },
    { gap: 14, stage: 'restart' },
    { gap: 30, stage: 'restart' },
  ] as const)('gap $gap → $stage', ({ gap, stage }) => {
    expect(resolveReturnStage({ lastDiaryAt: daysAgo(gap), now: noon })).toBe(stage);
  });

  it('returns null for a new user with no diary entries', () => {
    expect(resolveReturnStage({ lastDiaryAt: null, now: noon })).toBeNull();
  });
});

describe('planReturnReminder', () => {
  const base = {
    lastDiaryAt: daysAgo(6),
    lastOpenedAt: daysAgo(6),
    returnPushCountInWindow: 0,
    pushesByStage: {} as Record<string, number>,
    ignoredStreak: 0,
    valuePushOpened: false,
    now: noon,
    reminderHour: 20,
    reminderMinute: 0,
    profileId: 1,
  };

  it('does not schedule on days 0–2 or quick-checkin', () => {
    expect(
      planReturnReminder({ ...base, lastDiaryAt: daysAgo(1) }),
    ).toBeNull();
    expect(
      planReturnReminder({ ...base, lastDiaryAt: daysAgo(3) }),
    ).toBeNull();
  });

  it('schedules one value push when the user is also away from the app', () => {
    const reminder = planReturnReminder(base);
    expect(reminder?.kind).toBe('diary-return');
    expect(reminder?.profileId).toBe(1);
  });

  it('skips push when the user opened the app recently', () => {
    expect(
      planReturnReminder({ ...base, lastOpenedAt: daysAgo(0) }),
    ).toBeNull();
  });

  it('schedules reframe only after the value push was opened', () => {
    const away = { ...base, lastDiaryAt: daysAgo(10), lastOpenedAt: daysAgo(10) };
    expect(planReturnReminder({ ...away, valuePushOpened: false })).toBeNull();
    expect(planReturnReminder({ ...away, valuePushOpened: true })?.kind).toBe('diary-return');
  });

  it('never schedules on restart', () => {
    expect(
      planReturnReminder({
        ...base,
        lastDiaryAt: daysAgo(20),
        lastOpenedAt: daysAgo(20),
        valuePushOpened: true,
      }),
    ).toBeNull();
  });

  it('enforces one push per stage and two per 14-day window', () => {
    expect(
      planReturnReminder({ ...base, pushesByStage: { value: 1 } }),
    ).toBeNull();
    expect(
      planReturnReminder({ ...base, returnPushCountInWindow: 2 }),
    ).toBeNull();
  });

  it('silences after two ignored pushes', () => {
    expect(
      planReturnReminder({ ...base, ignoredStreak: RETURN_SILENCE_AFTER_IGNORED }),
    ).toBeNull();
  });

  it('applies quiet hours so a late reminder moves to morning', () => {
    const reminder = planReturnReminder({
      ...base,
      reminderHour: 23,
      reminderMinute: 30,
      quietStart: 22,
      quietEnd: 8,
    });
    expect(reminder?.at.getHours()).toBe(8);
    expect(reminder?.at.getMinutes()).toBe(0);
  });
});

describe('limitRemindersPerDay diary-return priority', () => {
  it('drops the return reminder when a clinical reminder already fills the day', () => {
    const day = new Date(2026, 6, 26, 9, 0, 0);
    const kept = limitRemindersPerDay(
      [
        { at: day, kind: 'act', profileId: 1, scaleId: 'act' },
        { at: day, kind: 'diary-return', profileId: 1 },
      ],
      1,
    );
    expect(kept).toHaveLength(1);
    expect(kept[0]?.kind).toBe('act');
  });
});

describe('latestDiaryTimestamp', () => {
  it('picks the newest createdAt', () => {
    expect(
      latestDiaryTimestamp([
        { createdAt: daysAgo(5) },
        { createdAt: daysAgo(2) },
        { createdAt: daysAgo(9) },
      ]),
    ).toBe(daysAgo(2));
  });
});

describe('calendarDaysBetween', () => {
  it('counts local calendar days, not elapsed hours', () => {
    const evening = new Date(2026, 6, 18, 22, 0, 0);
    const morning = new Date(2026, 6, 20, 7, 0, 0);
    expect(calendarDaysBetween(evening, morning)).toBe(2);
  });
});
