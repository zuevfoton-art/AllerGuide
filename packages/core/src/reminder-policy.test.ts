import { describe, expect, it } from 'vitest';
import { encodeDiaryDetails } from './diary';
import {
  applyQuietHours,
  collectActReminderTriggers,
  collectDoctorVisitReminders,
  collectEpinephrineExpiryReminders,
  computeNextDiaryReminderAt,
  hasDiaryEntryOnDate,
  limitRemindersPerDay,
  parseEpinephrineExpiryDate,
} from './reminder-policy';

describe('reminder-policy', () => {
  const noon = new Date('2026-06-25T12:00:00');

  it('detects diary entries on the same local day', () => {
    const entries = [{ type: 'Симптомы', details: '{}', createdAt: '2026-06-25T08:00:00.000Z' }];
    expect(hasDiaryEntryOnDate(entries, noon, noon)).toBe(true);
  });

  it('skips diary reminder later today when an entry already exists', () => {
    const entries = [{ type: 'Симптомы', details: '{}', createdAt: '2026-06-25T08:00:00.000Z' }];
    const next = computeNextDiaryReminderAt(entries, 20, 0, noon);
    expect(next.getDate()).toBe(26);
    expect(next.getHours()).toBe(20);
  });

  it('schedules diary reminder later today when no entry exists', () => {
    const next = computeNextDiaryReminderAt([], 20, 0, noon);
    expect(next.getDate()).toBe(25);
    expect(next.getHours()).toBe(20);
  });

  it('shifts quiet-hours times to the morning window', () => {
    expect(applyQuietHours(23, 0).hour).toBe(8);
    expect(applyQuietHours(7, 30).hour).toBe(8);
  });

  it('collects doctor visit reminders from structured entries', () => {
    const details = encodeDiaryDetails(
      {
        visitDoctorType: 'Аллерголог',
        visitDate: '30.06.2026 14:30',
      },
      'Визит к врачу',
    );
    const reminders = collectDoctorVisitReminders(
      [{ profileId: 1, type: 'Визит к врачу', details, createdAt: '2026-06-20T10:00:00.000Z' }],
      noon,
    );
    expect(reminders.length).toBeGreaterThan(0);
    expect(reminders[0]?.visitLabel).toBe('Аллерголог');
  });

  it('collects epinephrine expiry reminders', () => {
    const expiry = parseEpinephrineExpiryDate('2026-08');
    expect(expiry?.getMonth()).toBe(7);
    const reminders = collectEpinephrineExpiryReminders(1, '2026-08', noon);
    expect(reminders.length).toBeGreaterThan(0);
  });

  it('creates ACT reminder when asthma profile is due', () => {
    const triggers = collectActReminderTriggers(1, [], ['asthma'], noon, 9, 0);
    expect(triggers).toHaveLength(1);
    expect(triggers[0]?.scaleId).toBe('act');
  });

  it('limits reminders per day by priority', () => {
    const day = new Date('2026-06-26T09:00:00');
    const reminders = limitRemindersPerDay(
      [
        { at: day, kind: 'diary' },
        { at: day, kind: 'act', profileId: 1, scaleId: 'act' },
        { at: day, kind: 'epinephrine-expiry', profileId: 1 },
      ],
      2,
    );
    expect(reminders).toHaveLength(2);
    expect(reminders.some((item) => item.kind === 'diary')).toBe(false);
  });
});
