import { describe, expect, it } from 'vitest';
import { planHomeInsights } from './home-insights';
import type { AllergyConditionId } from './allergy-conditions';

describe('planHomeInsights', () => {
  const noon = new Date(2026, 6, 29, 12, 0, 0);

  it('asks to select a profile when none is active', () => {
    const planned = planHomeInsights({
      hasProfile: false,
      diaryEntries: [],
      conditions: [],
      enableActReminder: false,
      wellnessCount: 3,
      phenotypeCount: 2,
      now: noon,
    });
    expect(planned).toEqual([
      { id: 'select-profile', kind: 'select-profile', priority: 0 },
    ]);
  });

  it('prioritizes diary and ACT reminders before wellness rows', () => {
    const planned = planHomeInsights({
      hasProfile: true,
      diaryEntries: [],
      conditions: ['asthma'] as AllergyConditionId[],
      enableActReminder: true,
      wellnessCount: 2,
      phenotypeCount: 1,
      now: noon,
    });

    expect(planned.map((item) => item.kind)).toEqual([
      'diary-missing-today',
      'act-due',
      'wellness',
      'wellness',
      'phenotype',
    ]);
  });

  it('skips diary reminder when an entry exists today', () => {
    const planned = planHomeInsights({
      hasProfile: true,
      diaryEntries: [
        {
          type: 'symptoms',
          details: '{}',
          createdAt: noon.toISOString(),
        },
      ],
      conditions: [],
      enableActReminder: false,
      wellnessCount: 1,
      phenotypeCount: 0,
      now: noon,
    });

    expect(planned.some((item) => item.kind === 'diary-missing-today')).toBe(false);
    expect(planned[0]?.kind).toBe('wellness');
  });

  it('respects maxItems', () => {
    const planned = planHomeInsights({
      hasProfile: true,
      diaryEntries: [],
      conditions: [],
      enableActReminder: false,
      wellnessCount: 10,
      phenotypeCount: 10,
      now: noon,
      maxItems: 3,
    });
    expect(planned).toHaveLength(3);
  });
});
