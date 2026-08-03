import {
  getGatingConditions,
  normalizeOtherConditionLabel,
  parseConditionIds,
  type AllergyConditionId,
  type Profile,
} from '@allerguide/core';
import { getSetting, setSetting } from '@/src/services/settings-service';

function conditionsKey(profileId: number) {
  return `profileConditions:${profileId}`;
}

function otherConditionLabelKey(profileId: number) {
  return `otherConditionLabel:${profileId}`;
}

export function getStoredProfileConditions(profileId: number): AllergyConditionId[] {
  return parseConditionIds(getSetting(conditionsKey(profileId)));
}

export function setStoredProfileConditions(profileId: number, conditions: AllergyConditionId[]) {
  setSetting(conditionsKey(profileId), conditions.join(','));
}

/** Free-text name for condition type `other` (FR-PROF-03). */
export function getStoredOtherConditionLabel(profileId: number): string {
  return normalizeOtherConditionLabel(getSetting(otherConditionLabelKey(profileId)));
}

export function setStoredOtherConditionLabel(profileId: number, label: string) {
  const normalized = normalizeOtherConditionLabel(label);
  setSetting(otherConditionLabelKey(profileId), normalized);
}

/** Explicit condition types used for module gating (explicit-first). */
export function getProfileConditions(profile: Profile): AllergyConditionId[] {
  return getGatingConditions(getStoredProfileConditions(profile.id));
}
