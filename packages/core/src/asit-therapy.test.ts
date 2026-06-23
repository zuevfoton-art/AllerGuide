import { describe, expect, it } from 'vitest';
import {
  ASIT_PHASE_LABELS,
  ASIT_ROUTE_LABELS,
  buildAsitPrefill,
  computeAsitCompliance,
  createDefaultAsitCourse,
  formatAsitReportSummary,
  formatAsitSummary,
  isAsitCourseConfigured,
  parseAsitCourse,
  serializeAsitCourse,
} from './asit-therapy';
import { encodeDiaryDetails } from './diary';

describe('asit-therapy', () => {
  it('serializes and parses ASIT course', () => {
    const course = {
      ...createDefaultAsitCourse(),
      allergen: 'Пыльца берёзы',
      drug: 'Сталораль',
      route: 'slit' as const,
      phase: 'maintenance' as const,
      scheduleNotes: '1 таблетка ежедневно',
    };
    const parsed = parseAsitCourse(serializeAsitCourse(course));
    expect(parsed?.drug).toBe('Сталораль');
    expect(parsed?.phase).toBe('maintenance');
  });

  it('builds diary prefill from active course', () => {
    const prefill = buildAsitPrefill({
      ...createDefaultAsitCourse(),
      allergen: 'Клещ',
      drug: 'Акаризакс',
      route: 'slit',
      phase: 'buildup',
      scheduleNotes: 'По схеме врача',
    });
    expect(prefill.asitDrug).toBe('Акаризакс');
    expect(prefill.asitRoute).toBe(ASIT_ROUTE_LABELS.slit);
    expect(prefill.asitPhase).toBe(ASIT_PHASE_LABELS.buildup);
  });

  it('detects configured course', () => {
    expect(isAsitCourseConfigured(null)).toBe(false);
    expect(
      isAsitCourseConfigured({
        ...createDefaultAsitCourse(),
        allergen: 'Берёза',
        drug: 'Сталораль',
      }),
    ).toBe(true);
  });

  it('formats compact ASIT diary summary', () => {
    const summary = formatAsitSummary({
      asitDrug: 'Сталораль',
      asitAllergen: 'Берёза',
      asitTakenAt: '20 июня, 09:00',
      asitOnSchedule: 'В срок',
      asitReaction: 'Нет реакции',
    });
    expect(summary).toContain('Сталораль');
    expect(summary).toContain('В срок');
  });

  it('computes compliance from diary entries', () => {
    const entries = [
      {
        type: 'АСИТ',
        createdAt: '2026-06-20T09:00:00.000Z',
        details: encodeDiaryDetails({
          asitDrug: 'Сталораль',
          asitTakenAt: '20 июня',
          asitOnSchedule: 'В срок',
          asitReaction: 'Нет реакции',
        }),
      },
      {
        type: 'АСИТ',
        createdAt: '2026-06-18T09:00:00.000Z',
        details: encodeDiaryDetails({
          asitDrug: 'Сталораль',
          asitTakenAt: '18 июня',
          asitOnSchedule: 'Пропущена',
          asitReaction: 'Лёгкая',
        }),
      },
    ];

    const summary = computeAsitCompliance(entries, 30);
    expect(summary.totalDoses).toBe(2);
    expect(summary.onTime).toBe(1);
    expect(summary.missed).toBe(1);
    expect(summary.reactions.mild).toBe(1);
  });

  it('formats doctor report ASIT block', () => {
    const course = {
      ...createDefaultAsitCourse(),
      allergen: 'Берёза',
      drug: 'Сталораль',
      route: 'slit' as const,
      phase: 'maintenance' as const,
      scheduleNotes: 'Ежедневно',
    };
    const text = formatAsitReportSummary(
      {
        totalDoses: 2,
        onTime: 2,
        delayed: 0,
        missed: 0,
        reactions: { none: 2, mild: 0, moderate: 0, severe: 0 },
        lastDoseAt: '2026-06-20T09:00:00.000Z',
        lastReaction: 'Нет реакции',
      },
      course,
      30,
    );
    expect(text).toContain('Сталораль');
    expect(text).toContain('Приёмов: 2');
  });
});
