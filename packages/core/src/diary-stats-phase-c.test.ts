import { describe, expect, it } from 'vitest';
import {
  computeDiaryInsights,
  computeTemporalCorrelations,
  detectSymptomWithoutTriggerAnomaly,
} from './diary-stats';
import { encodeDiaryDetails } from './diary';
import type { DiaryEntry } from './types';

function entryAt(
  type: string,
  daysBack: number,
  hour: number,
  answers: Record<string, string>,
): DiaryEntry {
  const at = new Date();
  at.setDate(at.getDate() - daysBack);
  at.setUTCHours(hour, 0, 0, 0);
  return {
    id: Math.random(),
    profileId: 1,
    type,
    details: encodeDiaryDetails(answers, type),
    createdAt: at.toISOString(),
  };
}

describe('diary-stats Phase C', () => {
  it('detects temporal symptom-trigger correlation within ±4h (C.3)', () => {
    const entries = [
      entryAt('Симптомы', 1, 10, { symptoms: 'зуд', severity0_3: '2 — умеренная' }),
      entryAt('Триггер', 1, 11, { trigger: 'пыльца' }),
      entryAt('Симптомы', 2, 9, { symptoms: 'кашель', severity0_3: '1 — лёгкая' }),
      entryAt('Триггер', 2, 14, { trigger: 'холод' }),
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
      entryAt('Симптомы', 0, 10, { symptoms: 'зуд', severity0_3: '1 — лёгкая' }),
      entryAt('Триггер', 0, 10, { trigger: 'пыльца' }),
    ];
    const insights = computeDiaryInsights(entries);
    expect(insights.temporalCorrelationOf).toBeGreaterThanOrEqual(0);
    expect(insights.anomalyDays).toBeGreaterThanOrEqual(0);
  });
});
