import type {
  AllergyConditionId,
  ComorbidityLink,
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
  'comorbidity',
  'allergens',
  'phenotypeSummary',
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
  comorbidityLinks: ComorbidityLink[];
  contacts: EmergencyContactDraft[];
  childConsent: boolean;
  profileType: ProfileType;
}

export interface ProfileSetupWizardNavOptions {
  skipConditionHistory?: boolean;
  skipComorbidity?: boolean;
  skipPhenotypeSummary?: boolean;
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
    case 'comorbidity':
    case 'phenotypeSummary':
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
    if (step === 'comorbidity' && shouldSkipComorbidityStep(draft)) continue;
    if (step === 'phenotypeSummary' && shouldSkipPhenotypeSummaryStep(draft)) continue;
    const error = validateProfileSetupWizardStep(step, draft, options);
    if (error) return error;
  }
  return null;
}

export function shouldSkipConditionHistoryStep(draft: Pick<ProfileSetupWizardDraft, 'conditions'>) {
  return draft.conditions.length === 0;
}

export function shouldSkipComorbidityStep(draft: Pick<ProfileSetupWizardDraft, 'conditions'>) {
  return draft.conditions.length < 2;
}

export function shouldSkipPhenotypeSummaryStep(draft: Pick<ProfileSetupWizardDraft, 'conditions'>) {
  return draft.conditions.length === 0;
}

export function getProfileSetupWizardStepIndex(step: ProfileSetupWizardStep): number {
  return PROFILE_SETUP_WIZARD_STEPS.indexOf(step);
}

function shouldSkipStep(step: ProfileSetupWizardStep, nav: ProfileSetupWizardNavOptions): boolean {
  if (step === 'conditionHistory' && nav.skipConditionHistory) return true;
  if (step === 'comorbidity' && nav.skipComorbidity) return true;
  if (step === 'phenotypeSummary' && nav.skipPhenotypeSummary) return true;
  return false;
}

export function getNextProfileSetupWizardStep(
  step: ProfileSetupWizardStep,
  nav: ProfileSetupWizardNavOptions = {},
): ProfileSetupWizardStep | null {
  const index = getProfileSetupWizardStepIndex(step);
  if (index < 0) return null;

  for (let i = index + 1; i < PROFILE_SETUP_WIZARD_STEPS.length; i += 1) {
    const next = PROFILE_SETUP_WIZARD_STEPS[i];
    if (shouldSkipStep(next, nav)) continue;
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
    if (shouldSkipStep(previous, nav)) continue;
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

export function reconcileComorbidityLinks(
  conditionIds: AllergyConditionId[],
  links: ComorbidityLink[],
): ComorbidityLink[] {
  const selected = new Set(conditionIds);
  return links.filter(
    (link) => selected.has(link.fromConditionId) && selected.has(link.toConditionId),
  );
}

export function buildProfileSetupWizardNavOptions(
  draft: Pick<ProfileSetupWizardDraft, 'conditions'>,
): ProfileSetupWizardNavOptions {
  return {
    skipConditionHistory: shouldSkipConditionHistoryStep(draft),
    skipComorbidity: shouldSkipComorbidityStep(draft),
    skipPhenotypeSummary: shouldSkipPhenotypeSummaryStep(draft),
  };
}
