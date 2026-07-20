import type { AllergyConditionId, AllergyConfirmationSource, ProfileType, Scenario } from '@allerguide/core';
import type { ConditionHistoryDrafts } from '@/src/components/ConditionHistoryEditor';
import type { EmergencyContactDraft } from '@/src/services/emergency-contact-service';

export {
  PROFILE_SETUP_WIZARD_STEPS,
  PROFILE_SETUP_WIZARD_STEP_COUNT,
  buildProfileSetupWizardNavOptions,
  getNextProfileSetupWizardStep,
  getPreviousProfileSetupWizardStep,
  getProfileSetupWizardStepIndex,
  reconcileComorbidityLinks,
  reconcileConditionHistoryDrafts,
  shouldSkipComorbidityStep,
  shouldSkipConditionHistoryStep,
  shouldSkipPhenotypeSummaryStep,
  validateProfileSetupWizardDraft,
  validateProfileSetupWizardStep,
  type ProfileSetupWizardErrorCode,
  type ProfileSetupWizardNavOptions,
  type ProfileSetupWizardStep,
} from '@allerguide/core';

/** Mobile wizard draft — aligns with core shape and local editor draft types. */
export interface ProfileSetupWizardDraft {
  name: string;
  birthYear: string;
  selectedAllergenIds: string[];
  confirmations: Record<string, AllergyConfirmationSource>;
  conditions: AllergyConditionId[];
  conditionHistoryDrafts: ConditionHistoryDrafts;
  comorbidityLinks: import('@allerguide/core').ComorbidityLink[];
  contacts: EmergencyContactDraft[];
  childConsent: boolean;
  profileType: ProfileType;
}

export type ProfileSetupWizardValidationOptions = { scenario?: Scenario | null };
