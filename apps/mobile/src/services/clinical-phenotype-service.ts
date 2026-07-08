import {
  buildConditionHistoryFromOnboarding,
  isEpinephrineEligible,
  parseProfileAllergenIds,
  resolveClinicalPhenotypes,
  type Profile,
  type ProfileType,
  type ResolvedClinicalPhenotypes,
} from '@allerguide/core';
import { getStoredProfileConditions } from '@/src/services/profile-conditions-service';
import { getStoredConditionHistory } from '@/src/services/condition-history-service';
import { getAllergyPassport } from '@/src/services/sos-passport-service';

export function resolveProfileClinicalPhenotypes(
  profile: Profile,
  options: { profileType?: ProfileType } = {},
): ResolvedClinicalPhenotypes {
  const conditionIds = getStoredProfileConditions(profile.id);
  const history = getStoredConditionHistory(profile.id);
  const passport = getAllergyPassport(profile.id);

  return resolveClinicalPhenotypes({
    conditionIds,
    history,
    comorbidityLinks: history?.comorbidityLinks,
    allergenIds: parseProfileAllergenIds(profile.allergies),
    anaphylaxisHistory: passport.anaphylaxisHistory,
    profileType: options.profileType ?? profile.type,
    birthYear: profile.birthYear,
  });
}

export function getProfileReassessmentHints(profile: Profile): string[] {
  return resolveProfileClinicalPhenotypes(profile).reassessmentHints;
}

export function isProfileEpinephrineEligible(profile: Profile): boolean {
  const phenotypes = resolveProfileClinicalPhenotypes(profile);
  const passport = getAllergyPassport(profile.id);
  return isEpinephrineEligible({
    conditionIds: getStoredProfileConditions(profile.id),
    anaphylaxisHistory: passport.anaphylaxisHistory,
    phenotypeIds: phenotypes.phenotypeIds,
  });
}

export function buildDraftClinicalPhenotypes(input: {
  conditionIds: Parameters<typeof buildConditionHistoryFromOnboarding>[0];
  conditionHistoryDrafts: Parameters<typeof buildConditionHistoryFromOnboarding>[1];
  comorbidityLinks: Parameters<typeof buildConditionHistoryFromOnboarding>[2];
  allergenIds: string[];
  profileType: ProfileType;
  birthYear?: number;
}): ResolvedClinicalPhenotypes {
  return resolveClinicalPhenotypes({
    conditionIds: input.conditionIds,
    history: buildConditionHistoryFromOnboarding(
      input.conditionIds,
      input.conditionHistoryDrafts,
      input.comorbidityLinks ?? [],
    ),
    comorbidityLinks: input.comorbidityLinks,
    allergenIds: input.allergenIds,
    profileType: input.profileType,
    birthYear: input.birthYear,
  });
}
