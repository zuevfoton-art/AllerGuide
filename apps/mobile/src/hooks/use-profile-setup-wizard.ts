import type {
  AllergyConditionId,
  ConditionEpisodeInput,
  ProfileType,
  Scenario,
  AllergyConfirmationSource,
} from '@allerguide/core';
import { needsChildConsent } from '@allerguide/core';
import type { EmergencyContactDraft } from '@/src/services/emergency-contact-service';
import type { ConditionHistoryDrafts } from '@/src/components/ConditionHistoryEditor';

export const PROFILE_SETUP_WIZARD_STEPS = [
  'name',
  'birthYear',
  'conditions',
  'conditionHistory',
  'allergens',
  'contacts',
] as const;

export type ProfileSetupWizardStep = (typeof PROFILE_SETUP_WIZARD_STEPS)[number];

export const PROFILE_SETUP_WIZARD_STEP_COUNT = PROFILE_SETUP_WIZARD_STEPS.length;

export type ProfileSetupWizardErrorCode =
  | 'name_required'
  | 'birth_year_invalid'
  | 'child_consent_required'
  | 'allergen_required';

export interface ProfileSetupWizardDraft {
  name: string;
  birthYear: string;
  selectedAllergenIds: string[];
  confirmations: Record<string, AllergyConfirmationSource>;
  conditions: AllergyConditionId[];
  conditionHistoryDrafts: ConditionHistoryDrafts;
  contacts: EmergencyContactDraft[];
  childConsent: boolean;
  profileType: ProfileType;
}

export interface ProfileSetupWizardNavOptions {
  skipConditionHistory?: boolean;
}

export function validateProfileSetupWizardStep(
  step: ProfileSetupWizardStep,
  draft: ProfileSetupWizardDraft,
  options: { scenario?: Scenario | null },
): ProfileSetupWizardErrorCode | null {
  switch (step) {
    case 'name':
      if (!draft.name.trim()) return 'name_required';
      return null;
    case 'birthYear': {
      const year = Number(draft.birthYear);
      if (!draft.birthYear || Number.isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
        return 'birth_year_invalid';
      }
      if (needsChildConsent(draft.profileType, options.scenario ?? undefined) && !draft.childConsent) {
        return 'child_consent_required';
      }
      return null;
    }
    case 'conditions':
    case 'conditionHistory':
      return null;
    case 'allergens':
      if (draft.selectedAllergenIds.length === 0) return 'allergen_required';
      return null;
    case 'contacts':
      return null;
    default:
      return null;
  }
}

export function validateProfileSetupWizardDraft(
  draft: ProfileSetupWizardDraft,
  options: { scenario?: Scenario | null },
): ProfileSetupWizardErrorCode | null {
  for (const step of PROFILE_SETUP_WIZARD_STEPS) {
    if (step === 'conditionHistory' && shouldSkipConditionHistoryStep(draft)) continue;
    const error = validateProfileSetupWizardStep(step, draft, options);
    if (error) return error;
  }
  return null;
}

export function shouldSkipConditionHistoryStep(draft: Pick<ProfileSetupWizardDraft, 'conditions'>) {
  return draft.conditions.length === 0;
}

export function getProfileSetupWizardStepIndex(step: ProfileSetupWizardStep): number {
  return PROFILE_SETUP_WIZARD_STEPS.indexOf(step);
}

export function getNextProfileSetupWizardStep(
  step: ProfileSetupWizardStep,
  nav: ProfileSetupWizardNavOptions = {},
): ProfileSetupWizardStep | null {
  const index = getProfileSetupWizardStepIndex(step);
  if (index < 0) return null;

  for (let i = index + 1; i < PROFILE_SETUP_WIZARD_STEPS.length; i += 1) {
    const next = PROFILE_SETUP_WIZARD_STEPS[i];
    if (next === 'conditionHistory' && nav.skipConditionHistory) continue;
    return next;
  }
  return null;
}

export function getPreviousProfileSetupWizardStep(
  step: ProfileSetupWizardStep,
  nav: ProfileSetupWizardNavOptions = {},
): ProfileSetupWizardStep | null {
  const index = getProfileSetupWizardStepIndex(step);
  if (index <= 0) return null;

  for (let i = index - 1; i >= 0; i -= 1) {
    const previous = PROFILE_SETUP_WIZARD_STEPS[i];
    if (previous === 'conditionHistory' && nav.skipConditionHistory) continue;
    return previous;
  }
  return null;
}

export function reconcileConditionHistoryDrafts(
  conditionIds: AllergyConditionId[],
  drafts: ConditionHistoryDrafts,
): ConditionHistoryDrafts {
  const next: ConditionHistoryDrafts = {};
  for (const conditionId of conditionIds) {
    next[conditionId] = drafts[conditionId] ?? {
      onsetKind: 'unknown',
      status: 'active',
      diagnosedBy: 'self_reported',
    } satisfies ConditionEpisodeInput;
  }
  return next;
}
