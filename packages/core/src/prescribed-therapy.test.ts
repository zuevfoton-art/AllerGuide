import { describe, expect, it } from 'vitest';
import {
  PRESCRIBED_SIMPLIFIED_STEP_IDS,
  PRESCRIBED_THERAPY_DOSE_STATUS_LABELS,
  buildPrescribedTherapyDiarySummary,
  buildPrescribedTherapyPrefill,
  computePrescribedCompliance,
  createDefaultPrescribedCourse,
  isPrescribedCourseConfigured,
  normalizeTherapyDoseStatus,
  parsePrescribedCourse,
  serializePrescribedCourse,
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
});
