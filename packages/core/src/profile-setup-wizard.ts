import type { AllergyConfirmationSource } from './allergy-confirmations';
import type { AllergyConditionId } from './allergy-conditions';
import type { ComorbidityLink, ConditionEpisodeInput } from './condition-history';
import type { ConditionOptionSelections } from './condition-option-selections';
import { getCrossReactionsForSelection } from './cross-reactions';
import type { EmergencyContactRelation } from './emergency-contacts';
import {
  createEmptySymptomBaseline,
  isSymptomBaselineEmpty,
  type ProfileSymptomBaseline,
} from './profile-symptom-baseline';
import { needsChildConsent } from './profile-validation';
import { PROFILE_BIRTH_YEAR_MIN } from './profile-validation';
import type { ProfileType, Scenario } from './types';

/**
 * Profile setup wizard steps (UX split P1–P3).
 * Clinical: conditions → allergens → cross → allergenConfirmations → symptoms → history → …
 */
export const PROFILE_SETUP_WIZARD_STEPS = [
  'name',
  'birthYear',
  'conditions',
  'allergens',
  'crossReactions',
  'allergenConfirmations',
  'symptomBaseline',
  'conditionHistory',
  'comorbidity',
  'phenotypeSummary',
  'contacts',
] as const;

export type ProfileSetupWizardStep = (typeof PROFILE_SETUP_WIZARD_STEPS)[number];

export const PROFILE_SETUP_WIZARD_STEP_COUNT = PROFILE_SETUP_WIZARD_STEPS.length;

/** Steps the wizard advances past even when nothing was entered. */
export const PROFILE_SETUP_OPTIONAL_STEPS: ReadonlySet<string> = new Set([
  'crossReactions',
  'allergenConfirmations',
  'symptomBaseline',
  'conditionHistory',
  'comorbidity',
  'phenotypeSummary',
  'contacts',
]);

export type ProfileSetupWizardErrorCode =
  | 'name_required'
  | 'birth_year_invalid'
  | 'child_consent_required'
  | 'conditions_required'
  | 'allergen_required';

export type ProfileSetupConditionHistoryDrafts = Partial<
  Record<AllergyConditionId, ConditionEpisodeInput>
>;

export interface ProfileSetupContactDraft {
  id?: number;
  name: string;
  phone: string;
  relation: EmergencyContactRelation | string;
}

export interface ProfileSetupWizardDraft {
  name: string;
  birthYear: string;
  selectedAllergenIds: string[];
  /** Allergen ids accepted from cross-reactions step — stored separately from primary allergens. */
  crossReactionAllergenIds: string[];
  confirmations: Record<string, AllergyConfirmationSource>;
  conditions: AllergyConditionId[];
  /** FR-PROF-03 sub-options for selected condition types (pre-seed allergens). */
  conditionOptionSelections: ConditionOptionSelections;
  symptomBaseline: ProfileSymptomBaseline;
  conditionHistoryDrafts: ProfileSetupConditionHistoryDrafts;
  comorbidityLinks: ComorbidityLink[];
  contacts: ProfileSetupContactDraft[];
  childConsent: boolean;
  profileType: ProfileType;
}

export interface ProfileSetupWizardNavOptions {
  skipConditionHistory?: boolean;
  skipComorbidity?: boolean;
  skipPhenotypeSummary?: boolean;
  skipCrossReactions?: boolean;
  skipAllergenConfirmations?: boolean;
}

export function createEmptyProfileSetupWizardDraft(
  profileType: ProfileType = 'self',
): ProfileSetupWizardDraft {
  return {
    name: '',
    birthYear: '',
    selectedAllergenIds: [],
    crossReactionAllergenIds: [],
    confirmations: {},
    conditions: [],
    conditionOptionSelections: {},
    symptomBaseline: createEmptySymptomBaseline(),
    conditionHistoryDrafts: {},
    comorbidityLinks: [],
    contacts: [],
    childConsent: false,
    profileType,
  };
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
      if (
        !draft.birthYear ||
        Number.isNaN(year) ||
        year < PROFILE_BIRTH_YEAR_MIN ||
        year > new Date().getFullYear()
      ) {
        return 'birth_year_invalid';
      }
      if (needsChildConsent(draft.profileType, options.scenario ?? undefined) && !draft.childConsent) {
        return 'child_consent_required';
      }
      return null;
    }
    case 'conditions':
      if (draft.conditions.length === 0) return 'conditions_required';
      return null;
    case 'allergens':
      if (draft.selectedAllergenIds.length === 0) return 'allergen_required';
      return null;
    case 'crossReactions':
    case 'allergenConfirmations':
    case 'symptomBaseline':
    case 'conditionHistory':
    case 'comorbidity':
    case 'phenotypeSummary':
    case 'contacts':
      return null;
    default:
      return null;
  }
}

/**
 * Whether an optional step already holds user input. Lets the wizard label its
 * primary action «Skip» instead of adding a second button that does the same.
 */
export function isProfileSetupStepFilled(
  step: ProfileSetupWizardStep,
  draft: Pick<
    ProfileSetupWizardDraft,
    'crossReactionAllergenIds' | 'symptomBaseline' | 'contacts'
  >,
): boolean {
  switch (step) {
    case 'crossReactions':
      return draft.crossReactionAllergenIds.length > 0;
    case 'symptomBaseline':
      return !isSymptomBaselineEmpty(draft.symptomBaseline);
    case 'contacts':
      return draft.contacts.some((contact) => contact.name.trim() || contact.phone.trim());
    default:
      return true;
  }
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

/** Auto-skip when there are no related allergens to review. */
export function shouldSkipCrossReactionsStep(
  draft: Pick<ProfileSetupWizardDraft, 'selectedAllergenIds'>,
) {
  if (draft.selectedAllergenIds.length === 0) return true;
  return getCrossReactionsForSelection(draft.selectedAllergenIds).length === 0;
}

/** Skip allergen confirmations when no primary allergens are selected. */
export function shouldSkipAllergenConfirmationsStep(
  draft: Pick<ProfileSetupWizardDraft, 'selectedAllergenIds'>,
): boolean {
  return draft.selectedAllergenIds.length === 0;
}

export function buildProfileSetupWizardNavOptions(
  draft: Pick<ProfileSetupWizardDraft, 'conditions' | 'selectedAllergenIds'>,
): ProfileSetupWizardNavOptions {
  return {
    skipConditionHistory: shouldSkipConditionHistoryStep(draft),
    skipComorbidity: shouldSkipComorbidityStep(draft),
    skipPhenotypeSummary: shouldSkipPhenotypeSummaryStep(draft),
    skipCrossReactions: shouldSkipCrossReactionsStep(draft),
    skipAllergenConfirmations: shouldSkipAllergenConfirmationsStep(draft),
  };
}

function shouldSkipStep(step: ProfileSetupWizardStep, nav: ProfileSetupWizardNavOptions): boolean {
  if (step === 'conditionHistory' && nav.skipConditionHistory) return true;
  if (step === 'comorbidity' && nav.skipComorbidity) return true;
  if (step === 'phenotypeSummary' && nav.skipPhenotypeSummary) return true;
  if (step === 'crossReactions' && nav.skipCrossReactions) return true;
  if (step === 'allergenConfirmations' && nav.skipAllergenConfirmations) return true;
  return false;
}

/** Steps the user will actually see for the current draft (skips applied). */
export function getVisibleProfileSetupSteps(
  draft: Pick<ProfileSetupWizardDraft, 'conditions' | 'selectedAllergenIds'>,
): ProfileSetupWizardStep[] {
  const nav = buildProfileSetupWizardNavOptions(draft);
  return PROFILE_SETUP_WIZARD_STEPS.filter((step) => !shouldSkipStep(step, nav));
}

export function getVisibleProfileSetupStepProgress(
  current: ProfileSetupWizardStep,
  draft: Pick<ProfileSetupWizardDraft, 'conditions' | 'selectedAllergenIds'>,
): { current: number; total: number } {
  const visible = getVisibleProfileSetupSteps(draft);
  const index = visible.indexOf(current);
  return {
    current: index >= 0 ? index + 1 : 1,
    total: Math.max(visible.length, 1),
  };
}

export function validateProfileSetupWizardDraft(
  draft: ProfileSetupWizardDraft,
  options: { scenario?: Scenario | null },
): ProfileSetupWizardErrorCode | null {
  const nav = buildProfileSetupWizardNavOptions(draft);
  for (const step of PROFILE_SETUP_WIZARD_STEPS) {
    if (shouldSkipStep(step, nav)) continue;
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
  drafts: ProfileSetupConditionHistoryDrafts,
): ProfileSetupConditionHistoryDrafts {
  const next: ProfileSetupConditionHistoryDrafts = {};
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

/** Merge accepted cross-reaction allergen ids into the selection (deduped). */
export function mergeCrossReactionAllergenIds(
  selectedAllergenIds: string[],
  acceptedRelatedIds: string[],
): string[] {
  return [...new Set([...selectedAllergenIds, ...acceptedRelatedIds])];
}
