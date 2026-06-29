import { describe, expect, it } from 'vitest';
import {
  computeDiaryInsights,
  computeTemporalCorrelations,
  detectSymptomWithoutTriggerAnomaly,
} from './diary-stats';
import { encodeDiaryDetails } from './diary';
import type { DiaryEntry } from './types';

function entry(type: string, iso: string, hour: number, answers: Record<string, string>): DiaryEntry {
  const h = String(hour).padStart(2, '0');
  return {
    id: Math.random(),
    profileId: 1,
    type,
    details: encodeDiaryDetails(answers, type),
    createdAt: `${iso}T${h}:00:00.000Z`,
  };
}

describe('diary-stats Phase C', () => {
  it('detects temporal symptom-trigger correlation within ±4h (C.3)', () => {
    const entries = [
      entry('Симптомы', '2026-06-20', 10, { symptoms: 'зуд', severity0_3: '2 — умеренная' }),
      entry('Триггер', '2026-06-20', 11, { trigger: 'пыльца' }),
      entry('Симптомы', '2026-06-19', 9, { symptoms: 'кашель', severity0_3: '1 — лёгкая' }),
      entry('Триггер', '2026-06-19', 14, { trigger: 'холод' }),
    ];
    const result = computeTemporalCorrelations(entries);
    expect(result.kind).toBe('symptom-trigger');
    expect(result.count).toBeGreaterThanOrEqual(1);
  });

  it('detects symptom days without trigger anomaly (C.6)', () => {
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      days.push({
        iso,
        count: 1,
        hasSymptoms: i <= 2,
        hasMeds: false,
        hasFood: false,
        hasTrigger: false,
      });
    }
    const anomaly = detectSymptomWithoutTriggerAnomaly(days);
    expect(anomaly.kind).toBe('symptoms-without-trigger');
    expect(anomaly.days).toBe(3);
  });

  it('includes temporal fields in insights', () => {
    const entries = [
      entry('Симптомы', '2026-06-20', 10, { symptoms: 'зуд', severity0_3: '1 — лёгкая' }),
      entry('Триггер', '2026-06-20', 10, { trigger: 'пыльца' }),
    ];
    const insights = computeDiaryInsights(entries);
    expect(insights.temporalCorrelationOf).toBeGreaterThanOrEqual(0);
    expect(insights.anomalyDays).toBeGreaterThanOrEqual(0);
  });
});
