import {
  parseConditionIds,
  type AllergyConditionId,
  resolveProfileConditions,
} from '@allerguide/core';
import { getSetting, setSetting } from '@/src/services/settings-service';
import { parseAllergies, type Profile } from '@allerguide/core';

function conditionsKey(profileId: number) {
  return `profileConditions:${profileId}`;
}

export function getStoredProfileConditions(profileId: number): AllergyConditionId[] {
  return parseConditionIds(getSetting(conditionsKey(profileId)));
}

export function setStoredProfileConditions(profileId: number, conditions: AllergyConditionId[]) {
  setSetting(conditionsKey(profileId), conditions.join(','));
}

export function getProfileConditions(profile: Profile): AllergyConditionId[] {
  const allergies = parseAllergies(profile.allergies);
  const explicit = getStoredProfileConditions(profile.id);
  return resolveProfileConditions(allergies, explicit);
}
