import { describe, expect, it } from 'vitest';
import {
  PRESCRIBED_SIMPLIFIED_STEP_IDS,
  PRESCRIBED_THERAPY_DOSE_STATUS_LABELS,
  addPrescribedReminderTime,
  buildPrescribedTherapyDiarySummary,
  buildPrescribedTherapyPrefill,
  computePrescribedCompliance,
  createDefaultPrescribedCourse,
  formatPrescribedReminderTimes,
  getPrescribedReminderTimes,
  isPrescribedCourseConfigured,
  isPrescribedReminderConfigured,
  normalizeTherapyDoseStatus,
  parsePrescribedCourse,
  removePrescribedReminderTimeAt,
  serializePrescribedCourse,
  setPrescribedReminderEnabled,
  updatePrescribedReminderTimeAt,
} from './prescribed-therapy';
import { encodeDiaryDetails } from './diary';

describe('prescribed-therapy', () => {
  it('serializes and parses course', () => {
    const course = {
      ...createDefaultPrescribedCourse(),
      drug: 'Сингуляр',
      dosage: '10 мг',
      activated: true,
    };
    const parsed = parsePrescribedCourse(serializePrescribedCourse(course));
    expect(parsed?.drug).toBe('Сингуляр');
    expect(parsed?.dosage).toBe('10 мг');
  });

  it('requires activation for configured course', () => {
    expect(isPrescribedCourseConfigured(null)).toBe(false);
    expect(
      isPrescribedCourseConfigured({
        ...createDefaultPrescribedCourse(),
        drug: 'Сингуляр',
        activated: false,
      }),
    ).toBe(false);
    expect(
      isPrescribedCourseConfigured({
        ...createDefaultPrescribedCourse(),
        drug: 'Сингуляр',
        activated: true,
      }),
    ).toBe(true);
    // Legacy without activated flag remains configured
    const legacy = createDefaultPrescribedCourse();
    delete (legacy as { activated?: boolean }).activated;
    legacy.drug = 'Сингуляр';
    expect(isPrescribedCourseConfigured(legacy)).toBe(true);
  });

  it('normalizes RU and enum dose statuses', () => {
    expect(normalizeTherapyDoseStatus('В срок')).toBe('on-time');
    expect(normalizeTherapyDoseStatus('late')).toBe('late');
    expect(normalizeTherapyDoseStatus('Пропущена')).toBe('missed');
  });

  it('builds simplified step ids and prefill', () => {
    expect(PRESCRIBED_SIMPLIFIED_STEP_IDS).toContain('therapyTakenAt');
    expect(PRESCRIBED_SIMPLIFIED_STEP_IDS).not.toContain('therapyDrug');
    const prefill = buildPrescribedTherapyPrefill({
      ...createDefaultPrescribedCourse(),
      drug: 'Сингуляр',
      dosage: '10 мг',
      activated: true,
    });
    expect(prefill.therapyDrug).toBe('Сингуляр');
  });

  it('computes compliance from RU status labels', () => {
    const summary = computePrescribedCompliance(
      [
        {
          type: 'Терапия',
          details: encodeDiaryDetails({
            therapyDrug: 'Сингуляр',
            therapyStatus: 'В срок',
            therapyReaction: 'Нет',
          }),
          createdAt: new Date().toISOString(),
        },
        {
          type: 'Терапия',
          details: encodeDiaryDetails({
            therapyDrug: 'Сингуляр',
            therapyStatus: 'Пропущена',
            therapyReaction: 'Лёгкая',
          }),
          createdAt: new Date().toISOString(),
        },
      ],
      30,
    );
    expect(summary.totalDoses).toBe(2);
    expect(summary.onTime).toBe(1);
    expect(summary.missed).toBe(1);
    expect(summary.reactions).toBe(1);
  });

  it('formats diary summary with RU status', () => {
    const summary = buildPrescribedTherapyDiarySummary({
      therapyDrug: 'Сингуляр',
      therapyStatus: 'В срок',
      therapyTakenAt: '2026-07-01T08:00',
    });
    expect(summary).toContain('Сингуляр');
    expect(summary).toContain(PRESCRIBED_THERAPY_DOSE_STATUS_LABELS['on-time']);
  });

  it('supports multiple daily reminder times with legacy fallback', () => {
    const legacy = {
      ...createDefaultPrescribedCourse(),
      drug: 'Симбикорт',
      reminderHour: 8,
      reminderMinute: 0,
    };
    expect(isPrescribedReminderConfigured(legacy)).toBe(true);
    expect(getPrescribedReminderTimes(legacy)).toEqual([{ hour: 8, minute: 0 }]);

    let course = setPrescribedReminderEnabled(createDefaultPrescribedCourse(), true);
    course = addPrescribedReminderTime(course);
    expect(getPrescribedReminderTimes(course)).toHaveLength(2);
    course = updatePrescribedReminderTimeAt(course, 1, { hour: 20, minute: 30 });
    expect(formatPrescribedReminderTimes(getPrescribedReminderTimes(course))).toContain('20:30');
    course = removePrescribedReminderTimeAt(course, 0);
    expect(getPrescribedReminderTimes(course)).toEqual([{ hour: 20, minute: 30 }]);
    expect(course.reminderHour).toBe(20);
    expect(course.reminderMinute).toBe(30);

    course = setPrescribedReminderEnabled(course, false);
    expect(isPrescribedReminderConfigured(course)).toBe(false);
    expect(course.reminderTimes).toBeUndefined();
  });
});
