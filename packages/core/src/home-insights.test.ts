import { describe, expect, it } from 'vitest';
import {
  criticalityForHomeInsightKind,
  planHomeInsights,
  resolveVisibleHomeInsights,
} from './home-insights';
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
      {
        id: 'select-profile',
        kind: 'select-profile',
        priority: 0,
        criticality: 'important',
      },
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
      hasTherapyReminder: true,
      now: noon,
    });

    expect(planned.map((item) => item.kind)).toEqual([
      'diary-missing-today',
      'act-due',
      'therapy-reminder',
      'wellness',
      'wellness',
    ]);
    expect(planned.map((item) => item.criticality)).toEqual([
      'important',
      'important',
      'critical',
      'recommended',
      'recommended',
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

  it('replaces diary-missing-today with a return stage', () => {
    const planned = planHomeInsights({
      hasProfile: true,
      diaryEntries: [],
      conditions: [],
      enableActReminder: false,
      wellnessCount: 0,
      phenotypeCount: 0,
      now: noon,
      returnStage: 'quick-checkin',
    });
    expect(planned.map((item) => item.kind)).toEqual(['return-quick-checkin']);
  });

  it('drops check-in rows when Today already shows a standalone check-in', () => {
    const withoutStage = planHomeInsights({
      hasProfile: true,
      diaryEntries: [],
      conditions: [],
      enableActReminder: false,
      wellnessCount: 0,
      phenotypeCount: 0,
      now: noon,
      hasStandaloneCheckIn: true,
    });
    expect(withoutStage).toEqual([]);

    const withStage = planHomeInsights({
      hasProfile: true,
      diaryEntries: [],
      conditions: [],
      enableActReminder: false,
      wellnessCount: 0,
      phenotypeCount: 0,
      now: noon,
      returnStage: 'quick-checkin',
      hasStandaloneCheckIn: true,
    });
    expect(withStage).toEqual([]);
  });

  it('keeps later return stages even with a standalone check-in', () => {
    const planned = planHomeInsights({
      hasProfile: true,
      diaryEntries: [],
      conditions: [],
      enableActReminder: false,
      wellnessCount: 0,
      phenotypeCount: 0,
      now: noon,
      returnStage: 'reframe',
      hasStandaloneCheckIn: true,
    });
    expect(planned.map((item) => item.kind)).toEqual(['return-reframe']);
  });
});

describe('resolveVisibleHomeInsights', () => {
  it('shows critical group and collapses the rest', () => {
    const planned = [
      {
        id: 'therapy-reminder',
        kind: 'therapy-reminder' as const,
        priority: 3,
        criticality: 'critical' as const,
      },
      {
        id: 'act-due',
        kind: 'act-due' as const,
        priority: 2,
        criticality: 'important' as const,
      },
      {
        id: 'wellness-0',
        kind: 'wellness' as const,
        priority: 10,
        criticality: 'recommended' as const,
        wellnessIndex: 0,
      },
    ];
    const { visible, collapsed } = resolveVisibleHomeInsights(planned);
    expect(visible.map((item) => item.id)).toEqual(['therapy-reminder']);
    expect(collapsed.map((item) => item.id)).toEqual(['act-due', 'wellness-0']);
  });

  it('shows important when no critical', () => {
    const planned = [
      {
        id: 'act-due',
        kind: 'act-due' as const,
        priority: 2,
        criticality: 'important' as const,
      },
      {
        id: 'wellness-0',
        kind: 'wellness' as const,
        priority: 10,
        criticality: 'recommended' as const,
        wellnessIndex: 0,
      },
    ];
    const { visible, collapsed } = resolveVisibleHomeInsights(planned);
    expect(visible.map((item) => item.id)).toEqual(['act-due']);
    expect(collapsed.map((item) => item.id)).toEqual(['wellness-0']);
  });

  it('shows only the top recommended when no critical or important', () => {
    const planned = [
      {
        id: 'wellness-0',
        kind: 'wellness' as const,
        priority: 10,
        criticality: 'recommended' as const,
        wellnessIndex: 0,
      },
      {
        id: 'wellness-1',
        kind: 'wellness' as const,
        priority: 11,
        criticality: 'recommended' as const,
        wellnessIndex: 1,
      },
      {
        id: 'phenotype-0',
        kind: 'phenotype' as const,
        priority: 50,
        criticality: 'recommended' as const,
        phenotypeIndex: 0,
      },
    ];
    const { visible, collapsed } = resolveVisibleHomeInsights(planned);
    expect(visible.map((item) => item.id)).toEqual(['wellness-0']);
    expect(collapsed.map((item) => item.id)).toEqual(['wellness-1', 'phenotype-0']);
  });

  it('maps kinds to criticality', () => {
    expect(criticalityForHomeInsightKind('therapy-reminder')).toBe('critical');
    expect(criticalityForHomeInsightKind('act-due')).toBe('important');
    expect(criticalityForHomeInsightKind('wellness')).toBe('recommended');
  });
});
