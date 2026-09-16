import type { AllergyConditionId } from './allergy-conditions';
import type { ReturnStage } from './reengagement';
import {
  hasDiaryEntryOnDate,
  shouldScheduleActReminder,
  type DiaryEntryLike,
} from './reminder-policy';

export const HOME_INSIGHTS_MAX_ITEMS = 5;

export type PlannedHomeInsightKind =
  | 'select-profile'
  | 'diary-missing-today'
  | 'return-quick-checkin'
  | 'return-value'
  | 'return-reframe'
  | 'return-restart'
  | 'act-due'
  | 'therapy-reminder'
  | 'profile-incomplete'
  | 'wellness'
  | 'phenotype';

/** UX v2 recommendation criticality — domain-owned, not screen-owned. */
export type InsightCriticality = 'critical' | 'important' | 'recommended';

export type PlannedHomeInsight = {
  id: string;
  kind: PlannedHomeInsightKind;
  /** Lower number = higher priority */
  priority: number;
  criticality: InsightCriticality;
  wellnessIndex?: number;
  phenotypeIndex?: number;
};

export type PlanHomeInsightsInput = {
  hasProfile: boolean;
  diaryEntries: DiaryEntryLike[];
  conditions: AllergyConditionId[];
  enableActReminder: boolean;
  wellnessCount: number;
  phenotypeCount: number;
  hasTherapyReminder?: boolean;
  /**
   * Progressive profiling after an early wizard finish (N5): a soft row, never a
   * blocker and never framed as the user's failure.
   */
  hasEmergencyContacts?: boolean;
  now?: Date;
  maxItems?: number;
  returnStage?: ReturnStage | null;
  /**
   * Today owns a permanent 0–3 check-in block (north-star N2), so the rows that
   * only ask for a check-in would repeat it.
   */
  hasStandaloneCheckIn?: boolean;
};

export type VisibleHomeInsights = {
  /** Rows shown in the primary recommendation band. */
  visible: PlannedHomeInsight[];
  /** Remaining rows behind «Ещё N рекомендаций». */
  collapsed: PlannedHomeInsight[];
};

export function criticalityForHomeInsightKind(kind: PlannedHomeInsightKind): InsightCriticality {
  switch (kind) {
    case 'therapy-reminder':
      return 'critical';
    case 'select-profile':
    case 'diary-missing-today':
    case 'return-quick-checkin':
    case 'return-value':
    case 'return-reframe':
    case 'return-restart':
    case 'act-due':
    case 'profile-incomplete':
      return 'important';
    case 'wellness':
    case 'phenotype':
      return 'recommended';
  }
}

function withCriticality(
  insight: Omit<PlannedHomeInsight, 'criticality'> & { criticality?: InsightCriticality },
): PlannedHomeInsight {
  return {
    ...insight,
    criticality: insight.criticality ?? criticalityForHomeInsightKind(insight.kind),
  };
}

/**
 * Plans which recommendation/reminder rows the Home screen should show.
 * Content localization stays in the mobile adapter.
 */
export function planHomeInsights(input: PlanHomeInsightsInput): PlannedHomeInsight[] {
  const now = input.now ?? new Date();
  const maxItems = input.maxItems ?? HOME_INSIGHTS_MAX_ITEMS;
  const planned: PlannedHomeInsight[] = [];

  if (!input.hasProfile) {
    planned.push(
      withCriticality({ id: 'select-profile', kind: 'select-profile', priority: 0 }),
    );
    return planned.slice(0, maxItems);
  }

  const checkInRowWouldRepeatToday = input.hasStandaloneCheckIn === true;

  if (input.returnStage) {
    if (!(input.returnStage === 'quick-checkin' && checkInRowWouldRepeatToday)) {
      planned.push(
        withCriticality({
          id: `return-${input.returnStage}`,
          kind: `return-${input.returnStage}`,
          priority: 1,
        }),
      );
    }
  } else if (
    !checkInRowWouldRepeatToday &&
    !hasDiaryEntryOnDate(input.diaryEntries, now, now)
  ) {
    planned.push(
      withCriticality({
        id: 'diary-missing-today',
        kind: 'diary-missing-today',
        priority: 1,
      }),
    );
  }

  if (input.enableActReminder && shouldScheduleActReminder(input.diaryEntries, input.conditions)) {
    planned.push(withCriticality({ id: 'act-due', kind: 'act-due', priority: 2 }));
  }

  if (input.hasTherapyReminder) {
    planned.push(
      withCriticality({ id: 'therapy-reminder', kind: 'therapy-reminder', priority: 3 }),
    );
  }

  if (input.hasEmergencyContacts === false) {
    planned.push(
      withCriticality({ id: 'profile-incomplete', kind: 'profile-incomplete', priority: 4 }),
    );
  }

  for (let index = 0; index < input.wellnessCount; index += 1) {
    planned.push(
      withCriticality({
        id: `wellness-${index}`,
        kind: 'wellness',
        priority: 10 + index,
        wellnessIndex: index,
      }),
    );
  }

  for (let index = 0; index < input.phenotypeCount; index += 1) {
    planned.push(
      withCriticality({
        id: `phenotype-${index}`,
        kind: 'phenotype',
        priority: 50 + index,
        phenotypeIndex: index,
      }),
    );
  }

  return planned.sort((a, b) => a.priority - b.priority).slice(0, maxItems);
}

/**
 * Progressive disclosure for Today recommendations:
 * critical group → else important group → else one recommended; remainder collapsed.
 * Order inside each band follows `priority` (already sorted by `planHomeInsights`).
 */
export function resolveVisibleHomeInsights(planned: PlannedHomeInsight[]): VisibleHomeInsights {
  const critical = planned.filter((item) => item.criticality === 'critical');
  const important = planned.filter((item) => item.criticality === 'important');
  const recommended = planned.filter((item) => item.criticality === 'recommended');

  if (critical.length > 0) {
    return { visible: critical, collapsed: [...important, ...recommended] };
  }
  if (important.length > 0) {
    return { visible: important, collapsed: recommended };
  }
  if (recommended.length > 0) {
    return { visible: [recommended[0]!], collapsed: recommended.slice(1) };
  }
  return { visible: [], collapsed: [] };
}
