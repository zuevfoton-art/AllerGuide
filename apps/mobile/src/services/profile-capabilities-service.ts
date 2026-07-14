import {
  buildProfileCapabilities,
  getGatingConditions,
  parseAllergies,
  parseConditionIds,
  type AllergyConditionId,
  type Profile,
  type ProfileCapabilities,
} from '@allerguide/core';
import { getAllergyPassport } from '@/src/services/sos-passport-service';
import { getSetting, setSetting } from '@/src/services/settings-service';

function conditionsKey(profileId: number) {
  return `profileConditions:${profileId}`;
}

export function getStoredProfileConditions(profileId: number): AllergyConditionId[] {
  return parseConditionIds(getSetting(conditionsKey(profileId)));
}

export function setStoredProfileConditions(profileId: number, conditions: AllergyConditionId[]) {
  setSetting(conditionsKey(profileId), conditions.join(','));
}

/** Explicit condition types used for module gating (explicit-first). */
export function getProfileConditions(profile: Profile): AllergyConditionId[] {
  return getGatingConditions(getStoredProfileConditions(profile.id));
}

export function getProfileCapabilities(profile: Profile): ProfileCapabilities {
  const explicit = getStoredProfileConditions(profile.id);
  const passport = getAllergyPassport(profile.id);
  return buildProfileCapabilities({
    profile,
    explicitConditions: explicit,
    passport,
  });
}

export { parseAllergies };
