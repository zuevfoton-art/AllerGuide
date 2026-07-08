import type { AllergyConditionId, ProfileType, Scenario, AllergyConfirmationSource } from '@allerguide/core';
import { needsChildConsent } from '@allerguide/core';
import type { EmergencyContactDraft } from '@/src/services/emergency-contact-service';

export const PROFILE_SETUP_WIZARD_STEPS = [
  'name',
  'birthYear',
  'conditions',
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
  contacts: EmergencyContactDraft[];
  childConsent: boolean;
  profileType: ProfileType;
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
    const error = validateProfileSetupWizardStep(step, draft, options);
    if (error) return error;
  }
  return null;
}

export function getProfileSetupWizardStepIndex(step: ProfileSetupWizardStep): number {
  return PROFILE_SETUP_WIZARD_STEPS.indexOf(step);
}

export function getNextProfileSetupWizardStep(
  step: ProfileSetupWizardStep,
): ProfileSetupWizardStep | null {
  const index = getProfileSetupWizardStepIndex(step);
  if (index < 0 || index >= PROFILE_SETUP_WIZARD_STEPS.length - 1) return null;
  return PROFILE_SETUP_WIZARD_STEPS[index + 1] ?? null;
}

export function getPreviousProfileSetupWizardStep(
  step: ProfileSetupWizardStep,
): ProfileSetupWizardStep | null {
  const index = getProfileSetupWizardStepIndex(step);
  if (index <= 0) return null;
  return PROFILE_SETUP_WIZARD_STEPS[index - 1] ?? null;
}
