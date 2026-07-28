import { describe, expect, it } from 'vitest';
import type { AllergyConditionId } from './allergy-conditions';
import {
  buildProfileSetupWizardNavOptions,
  getNextProfileSetupWizardStep,
  getPreviousProfileSetupWizardStep,
  getVisibleProfileSetupStepProgress,
  getVisibleProfileSetupSteps,
  mergeCrossReactionAllergenIds,
  PROFILE_SETUP_WIZARD_STEP_COUNT,
  reconcileComorbidityLinks,
  reconcileConditionHistoryDrafts,
  shouldSkipComorbidityStep,
  shouldSkipCrossReactionsStep,
  shouldSkipPhenotypeSummaryStep,
  validateProfileSetupWizardDraft,
  validateProfileSetupWizardStep,
  type ProfileSetupWizardDraft,
} from './profile-setup-wizard';

const baseDraft = (): ProfileSetupWizardDraft => ({
  name: 'Анна',
  birthYear: '1990',
  selectedAllergenIds: ['milk'],
  confirmations: {},
  conditions: ['food'],
  conditionHistoryDrafts: {},
  comorbidityLinks: [],
  contacts: [],
  childConsent: false,
  profileType: 'self',
});

describe('profile setup wizard', () => {
  it('orders clinical steps: conditions → allergens → cross → history', () => {
    expect(PROFILE_SETUP_WIZARD_STEP_COUNT).toBe(9);
    expect(getNextProfileSetupWizardStep('name')).toBe('birthYear');
    expect(getNextProfileSetupWizardStep('conditions')).toBe('allergens');
    expect(getNextProfileSetupWizardStep('allergens')).toBe('crossReactions');
    expect(getNextProfileSetupWizardStep('crossReactions')).toBe('conditionHistory');
    expect(getNextProfileSetupWizardStep('contacts')).toBeNull();

    const fullNav = buildProfileSetupWizardNavOptions({
      conditions: ['food', 'asthma'],
      selectedAllergenIds: ['milk'],
    });
    expect(fullNav.skipCrossReactions).toBe(false);
    expect(getPreviousProfileSetupWizardStep('conditionHistory', fullNav)).toBe('crossReactions');
    expect(getPreviousProfileSetupWizardStep('allergens', fullNav)).toBe('conditions');
    expect(getPreviousProfileSetupWizardStep('name')).toBeNull();
  });

  it('skips cross-reactions when selection has no related allergens', () => {
    expect(shouldSkipCrossReactionsStep({ selectedAllergenIds: [] })).toBe(true);
    // epipen-case style id with no graph edges — use a non-catalog token
    expect(shouldSkipCrossReactionsStep({ selectedAllergenIds: ['unknown-allergen-xyz'] })).toBe(
      true,
    );
    expect(shouldSkipCrossReactionsStep({ selectedAllergenIds: ['milk'] })).toBe(false);
  });

  it('skips condition history when no conditions selected', () => {
    const nav = buildProfileSetupWizardNavOptions({
      conditions: [],
      selectedAllergenIds: ['milk'],
    });
    expect(nav.skipConditionHistory).toBe(true);
    expect(getNextProfileSetupWizardStep('crossReactions', nav)).toBe('contacts');
    expect(getPreviousProfileSetupWizardStep('allergens', nav)).toBe('conditions');
  });

  it('skips comorbidity when fewer than two conditions', () => {
    expect(shouldSkipComorbidityStep({ conditions: ['food'] })).toBe(true);
    const nav = buildProfileSetupWizardNavOptions({
      conditions: ['food'],
      selectedAllergenIds: ['milk'],
    });
    expect(getNextProfileSetupWizardStep('conditionHistory', nav)).toBe('phenotypeSummary');
  });

  it('skips phenotype summary when no conditions', () => {
    expect(shouldSkipPhenotypeSummaryStep({ conditions: [] })).toBe(true);
    const nav = buildProfileSetupWizardNavOptions({
      conditions: [],
      selectedAllergenIds: ['milk'],
    });
    expect(nav.skipCrossReactions).toBe(false);
    expect(getNextProfileSetupWizardStep('allergens', nav)).toBe('crossReactions');
  });

  it('reports progress against visible steps only', () => {
    const draft = {
      conditions: [] as AllergyConditionId[],
      selectedAllergenIds: ['unknown-allergen-xyz'],
    };
    const visible = getVisibleProfileSetupSteps(draft);
    expect(visible).toEqual(['name', 'birthYear', 'conditions', 'allergens', 'contacts']);
    expect(getVisibleProfileSetupStepProgress('allergens', draft)).toEqual({
      current: 4,
      total: 5,
    });
  });

  it('validates name step', () => {
    expect(validateProfileSetupWizardStep('name', { ...baseDraft(), name: '' }, {})).toBe(
      'name_required',
    );
    expect(validateProfileSetupWizardStep('name', baseDraft(), {})).toBeNull();
  });

  it('validates birth year and child consent', () => {
    expect(
      validateProfileSetupWizardStep('birthYear', { ...baseDraft(), birthYear: 'abc' }, {}),
    ).toBe('birth_year_invalid');
    expect(
      validateProfileSetupWizardStep(
        'birthYear',
        { ...baseDraft(), profileType: 'child', childConsent: false },
        { scenario: 'child' },
      ),
    ).toBe('child_consent_required');
    expect(
      validateProfileSetupWizardStep(
        'birthYear',
        { ...baseDraft(), profileType: 'child', childConsent: true },
        { scenario: 'child' },
      ),
    ).toBeNull();
  });

  it('requires at least one condition and allergen', () => {
    expect(
      validateProfileSetupWizardStep('conditions', { ...baseDraft(), conditions: [] }, {}),
    ).toBe('conditions_required');
    expect(
      validateProfileSetupWizardStep('allergens', { ...baseDraft(), selectedAllergenIds: [] }, {}),
    ).toBe('allergen_required');
    expect(validateProfileSetupWizardStep('crossReactions', baseDraft(), {})).toBeNull();
  });

  it('validates full draft before save', () => {
    expect(validateProfileSetupWizardDraft(baseDraft(), {})).toBeNull();
    expect(
      validateProfileSetupWizardDraft({ ...baseDraft(), selectedAllergenIds: [] }, {}),
    ).toBe('allergen_required');
    expect(
      validateProfileSetupWizardDraft({ ...baseDraft(), conditions: [] }, {}),
    ).toBe('conditions_required');
  });

  it('reconciles condition history drafts when conditions change', () => {
    const drafts = reconcileConditionHistoryDrafts(['food', 'asthma'], {
      food: { onsetKind: 'infancy', status: 'active', diagnosedBy: 'self_reported' },
    });
    expect(Object.keys(drafts)).toEqual(['food', 'asthma']);
    expect(drafts.asthma?.onsetKind).toBe('unknown');
  });

  it('reconciles comorbidity links when conditions change', () => {
    const links = reconcileComorbidityLinks(
      ['food'],
      [{ fromConditionId: 'food', toConditionId: 'asthma', relation: 'preceded' }],
    );
    expect(links).toEqual([]);
  });

  it('merges accepted cross-reaction ids', () => {
    expect(mergeCrossReactionAllergenIds(['milk'], ['goat-milk', 'milk', 'beef'])).toEqual([
      'milk',
      'goat-milk',
      'beef',
    ]);
  });
});
