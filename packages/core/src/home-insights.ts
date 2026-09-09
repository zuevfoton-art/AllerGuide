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

  const checkInRowWouldRepeatToday = input.hasStandaloneCheckIn === true;

  if (input.returnStage) {
    if (!(input.returnStage === 'quick-checkin' && checkInRowWouldRepeatToday)) {
      planned.push({
        id: `return-${input.returnStage}`,
        kind: `return-${input.returnStage}`,
        priority: 1,
      });
    }
  } else if (
    !checkInRowWouldRepeatToday &&
    !hasDiaryEntryOnDate(input.diaryEntries, now, now)
  ) {
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

  if (input.hasEmergencyContacts === false) {
    planned.push({ id: 'profile-incomplete', kind: 'profile-incomplete', priority: 4 });
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
