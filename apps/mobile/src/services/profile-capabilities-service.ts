import {
  buildProfileCapabilities,
  parseAllergies,
  type Profile,
  type ProfileCapabilities,
} from '@allerguide/core';
import { getAllergyPassport } from '@/src/services/sos-passport-service';
import {
  getProfileConditions,
  getStoredProfileConditions,
} from '@/src/services/profile-conditions-service';

export function getProfileCapabilities(profile: Profile): ProfileCapabilities {
  const explicit = getStoredProfileConditions(profile.id);
  const passport = getAllergyPassport(profile.id);
  return buildProfileCapabilities({
    profile,
    explicitConditions: explicit,
    passport,
  });
}

export { getProfileConditions, getStoredProfileConditions, parseAllergies };
