import { describe, expect, it } from 'vitest';
import { buildDoctorReportTimeline } from './doctor-report-timeline';
import { encodeDiaryDetails } from './diary';

describe('doctor-report-timeline (C.7)', () => {
  it('builds chronological timeline with coded symptoms', () => {
    const items = buildDoctorReportTimeline([
      {
        type: 'Симптомы',
        createdAt: '2026-06-20T10:00:00.000Z',
        details: encodeDiaryDetails(
          { symptoms: 'чихание', symptomCode: 'Чихание', severity0_3: '2 — умеренная' },
          'Симптомы',
        ),
      },
      {
        type: 'Триггер',
        createdAt: '2026-06-19T08:00:00.000Z',
        details: encodeDiaryDetails({ trigger: 'пыльца' }, 'Триггер'),
      },
    ]);

    expect(items).toHaveLength(2);
    expect(items[0]?.type).toBe('Симптомы');
    expect(items[0]?.codedSymptoms).toContain('SNOMED');
    expect(items[0]?.severityLabel).toBe('Умеренная');
  });
});
