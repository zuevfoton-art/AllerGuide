import type { AllergyConditionId } from './allergy-conditions';
import {
  hasDiaryEntryOnDate,
  shouldScheduleActReminder,
  type DiaryEntryLike,
} from './reminder-policy';

export const HOME_INSIGHTS_MAX_ITEMS = 5;

export type PlannedHomeInsightKind =
  | 'select-profile'
  | 'diary-missing-today'
  | 'act-due'
  | 'therapy-reminder'
  | 'wellness'
  | 'phenotype';

export type PlannedHomeInsight = {
  id: string;
  kind: PlannedHomeInsightKind;
  /** Lower number = higher priority */
  priority: number;
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
  now?: Date;
  maxItems?: number;
};

/**
 * Plans which recommendation/reminder rows the Home screen should show.
 * Content localization stays in the mobile adapter.
 */
export function planHomeInsights(input: PlanHomeInsightsInput): PlannedHomeInsight[] {
  const now = input.now ?? new Date();
  const maxItems = input.maxItems ?? HOME_INSIGHTS_MAX_ITEMS;
  const planned: PlannedHomeInsight[] = [];

  if (!input.hasProfile) {
    planned.push({ id: 'select-profile', kind: 'select-profile', priority: 0 });
    return planned.slice(0, maxItems);
  }

  if (!hasDiaryEntryOnDate(input.diaryEntries, now, now)) {
    planned.push({
      id: 'diary-missing-today',
      kind: 'diary-missing-today',
      priority: 1,
    });
  }

  if (input.enableActReminder && shouldScheduleActReminder(input.diaryEntries, input.conditions)) {
    planned.push({ id: 'act-due', kind: 'act-due', priority: 2 });
  }

  if (input.hasTherapyReminder) {
    planned.push({ id: 'therapy-reminder', kind: 'therapy-reminder', priority: 3 });
  }

  for (let index = 0; index < input.wellnessCount; index += 1) {
    planned.push({
      id: `wellness-${index}`,
      kind: 'wellness',
      priority: 10 + index,
      wellnessIndex: index,
    });
  }

  for (let index = 0; index < input.phenotypeCount; index += 1) {
    planned.push({
      id: `phenotype-${index}`,
      kind: 'phenotype',
      priority: 50 + index,
      phenotypeIndex: index,
    });
  }

  return planned.sort((a, b) => a.priority - b.priority).slice(0, maxItems);
}
