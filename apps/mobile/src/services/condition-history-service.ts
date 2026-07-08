import {
  buildConditionHistoryFromOnboarding,
  conditionHistoryToDraftMap,
  parseConditionHistory,
  reconcileConditionHistory,
  serializeConditionHistory,
  type AllergyConditionId,
  type ConditionEpisodeInput,
  type ConditionHistory,
} from '@allerguide/core';
import { getSetting, setSetting } from '@/src/services/settings-service';

function conditionHistoryKey(profileId: number) {
  return `conditionHistory:${profileId}`;
}

export function getStoredConditionHistory(profileId: number): ConditionHistory | null {
  return parseConditionHistory(getSetting(conditionHistoryKey(profileId)));
}

export function setStoredConditionHistory(profileId: number, history: ConditionHistory) {
  setSetting(conditionHistoryKey(profileId), serializeConditionHistory(history));
}

export function getConditionHistoryDrafts(
  profileId: number,
): Partial<Record<AllergyConditionId, ConditionEpisodeInput>> {
  return conditionHistoryToDraftMap(getStoredConditionHistory(profileId));
}

export function saveConditionHistoryFromOnboarding(
  profileId: number,
  conditionIds: AllergyConditionId[],
  drafts: Partial<Record<AllergyConditionId, Partial<ConditionEpisodeInput>>>,
) {
  const history = buildConditionHistoryFromOnboarding(conditionIds, drafts);
  setStoredConditionHistory(profileId, history);
}

export function reconcileStoredConditionHistory(
  profileId: number,
  conditionIds: AllergyConditionId[],
) {
  const current = getStoredConditionHistory(profileId);
  const next = reconcileConditionHistory(current, conditionIds);
  setStoredConditionHistory(profileId, next);
  return next;
}
