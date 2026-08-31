import { describe, expect, it } from 'vitest';
import type { AllergyConditionId } from './allergy-conditions';
import { createEmptySymptomBaseline } from './profile-symptom-baseline';
import {
  buildProfileSetupWizardNavOptions,
  createEmptyProfileSetupWizardDraft,
  getNextProfileSetupWizardStep,
  getPreviousProfileSetupWizardStep,
  getVisibleProfileSetupStepProgress,
  getVisibleProfileSetupSteps,
  mergeCrossReactionAllergenIds,
  PROFILE_SETUP_WIZARD_STEP_COUNT,
  reconcileComorbidityLinks,
  reconcileConditionHistoryDrafts,
  shouldSkipAllergenConfirmationsStep,
  shouldSkipComorbidityStep,
  shouldSkipCrossReactionsStep,
  shouldSkipPhenotypeSummaryStep,
  validateProfileSetupWizardDraft,
  validateProfileSetupWizardStep,
  type ProfileSetupWizardDraft,
} from './profile-setup-wizard';

const baseDraft = (): ProfileSetupWizardDraft => ({
  ...createEmptyProfileSetupWizardDraft('self'),
  name: 'Анна',
  birthYear: '1990',
  selectedAllergenIds: ['milk'],
  conditions: ['food'],
});

describe('profile setup wizard', () => {
  it('defers steps that profile editing covers out of the first run', () => {
    const draft = { conditions: ['food', 'asthma'] as AllergyConditionId[], selectedAllergenIds: ['milk'] };

    expect(getVisibleProfileSetupSteps(draft, { deferOptionalSteps: true })).toEqual([
      'name',
      'birthYear',
      'conditions',
      'allergens',
      'crossReactions',
    ]);

    // Without deferral the full clinical wizard is still available.
    expect(getVisibleProfileSetupSteps(draft)).toContain('symptomBaseline');
    expect(getVisibleProfileSetupSteps(draft)).toContain('contacts');

    const nav = buildProfileSetupWizardNavOptions(draft, { deferOptionalSteps: true });
    expect(getNextProfileSetupWizardStep('allergens', nav)).toBe('crossReactions');
    expect(getNextProfileSetupWizardStep('crossReactions', nav)).toBeNull();
  });

  it('orders clinical steps including allergenConfirmations and symptom baseline', () => {
    expect(PROFILE_SETUP_WIZARD_STEP_COUNT).toBe(11);
    expect(getNextProfileSetupWizardStep('conditions')).toBe('allergens');
    expect(getNextProfileSetupWizardStep('allergens')).toBe('crossReactions');
    expect(getNextProfileSetupWizardStep('crossReactions')).toBe('allergenConfirmations');
    expect(getNextProfileSetupWizardStep('allergenConfirmations')).toBe('symptomBaseline');
    expect(getNextProfileSetupWizardStep('symptomBaseline')).toBe('conditionHistory');

    const fullNav = buildProfileSetupWizardNavOptions({
      conditions: ['food', 'asthma'],
      selectedAllergenIds: ['milk'],
    });
    expect(getPreviousProfileSetupWizardStep('conditionHistory', fullNav)).toBe('symptomBaseline');
  });

  it('skips cross-reactions when selection has no related allergens', () => {
    expect(shouldSkipCrossReactionsStep({ selectedAllergenIds: [] })).toBe(true);
    expect(shouldSkipCrossReactionsStep({ selectedAllergenIds: ['unknown-allergen-xyz'] })).toBe(
      true,
    );
    expect(shouldSkipCrossReactionsStep({ selectedAllergenIds: ['milk'] })).toBe(false);
  });

  it('skips allergen confirmations when no allergens selected', () => {
    expect(shouldSkipAllergenConfirmationsStep({ selectedAllergenIds: [] })).toBe(true);
    expect(shouldSkipAllergenConfirmationsStep({ selectedAllergenIds: ['milk'] })).toBe(false);
  });

  it('skips condition history when no conditions selected', () => {
    const nav = buildProfileSetupWizardNavOptions({
      conditions: [],
      selectedAllergenIds: ['milk'],
    });
    expect(nav.skipConditionHistory).toBe(true);
    expect(getNextProfileSetupWizardStep('symptomBaseline', nav)).toBe('contacts');
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
  });

  it('reports progress against visible steps only', () => {
    const draft = {
      conditions: [] as AllergyConditionId[],
      selectedAllergenIds: ['unknown-allergen-xyz'],
    };
    const visible = getVisibleProfileSetupSteps(draft);
    // crossReactions skipped (no cross-reactions for unknown allergen)
    // allergenConfirmations NOT skipped (selectedAllergenIds.length > 0)
    // conditionHistory / comorbidity / phenotypeSummary skipped (no conditions)
    expect(visible).toEqual([
      'name',
      'birthYear',
      'conditions',
      'allergens',
      'allergenConfirmations',
      'symptomBaseline',
      'contacts',
    ]);
    expect(getVisibleProfileSetupStepProgress('allergens', draft)).toEqual({
      current: 4,
      total: 7,
    });
  });

  it('validates required steps and allows empty symptom baseline', () => {
    expect(validateProfileSetupWizardStep('conditions', { ...baseDraft(), conditions: [] }, {})).toBe(
      'conditions_required',
    );
    expect(
      validateProfileSetupWizardStep('allergens', { ...baseDraft(), selectedAllergenIds: [] }, {}),
    ).toBe('allergen_required');
    expect(
      validateProfileSetupWizardStep(
        'symptomBaseline',
        { ...baseDraft(), symptomBaseline: createEmptySymptomBaseline() },
        {},
      ),
    ).toBeNull();
    expect(validateProfileSetupWizardDraft(baseDraft(), {})).toBeNull();
  });

  it('reconciles history/comorbidity and merges cross ids', () => {
    const drafts = reconcileConditionHistoryDrafts(['food', 'asthma'], {
      food: { onsetKind: 'infancy', status: 'active', diagnosedBy: 'self_reported' },
    });
    expect(Object.keys(drafts)).toEqual(['food', 'asthma']);
    expect(
      reconcileComorbidityLinks(
        ['food'],
        [{ fromConditionId: 'food', toConditionId: 'asthma', relation: 'preceded' }],
      ),
    ).toEqual([]);
    expect(mergeCrossReactionAllergenIds(['milk'], ['goat-milk', 'milk'])).toEqual([
      'milk',
      'goat-milk',
    ]);
  });
});
