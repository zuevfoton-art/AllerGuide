import { describe, expect, it } from 'vitest';
import {
  buildProfileSetupWizardNavOptions,
  getNextProfileSetupWizardStep,
  getPreviousProfileSetupWizardStep,
  getVisibleProfileSetupStepProgress,
  PROFILE_SETUP_WIZARD_STEP_COUNT,
  reconcileComorbidityLinks,
  reconcileConditionHistoryDrafts,
  shouldSkipComorbidityStep,
  shouldSkipCrossReactionsStep,
  shouldSkipPhenotypeSummaryStep,
  validateProfileSetupWizardDraft,
  validateProfileSetupWizardStep,
  type ProfileSetupWizardDraft,
} from './use-profile-setup-wizard';

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

describe('profile setup wizard (mobile re-export)', () => {
  it('exposes reordered steps with crossReactions', () => {
    expect(PROFILE_SETUP_WIZARD_STEP_COUNT).toBe(9);
    expect(getNextProfileSetupWizardStep('conditions')).toBe('allergens');
    expect(getNextProfileSetupWizardStep('allergens')).toBe('crossReactions');
    expect(shouldSkipCrossReactionsStep({ selectedAllergenIds: ['milk'] })).toBe(false);
  });

  it('skips comorbidity when fewer than two conditions', () => {
    expect(shouldSkipComorbidityStep({ conditions: ['food'] })).toBe(true);
    const nav = buildProfileSetupWizardNavOptions({
      conditions: ['food'],
      selectedAllergenIds: ['milk'],
    });
    expect(getNextProfileSetupWizardStep('conditionHistory', nav)).toBe('phenotypeSummary');
  });

  it('skips phenotype when no conditions', () => {
    expect(shouldSkipPhenotypeSummaryStep({ conditions: [] })).toBe(true);
  });

  it('computes visible progress', () => {
    expect(
      getVisibleProfileSetupStepProgress('allergens', {
        conditions: [],
        selectedAllergenIds: ['unknown-allergen-xyz'],
      }),
    ).toEqual({ current: 4, total: 5 });
  });

  it('validates allergens and full draft', () => {
    expect(
      validateProfileSetupWizardStep('allergens', { ...baseDraft(), selectedAllergenIds: [] }, {}),
    ).toBe('allergen_required');
    expect(validateProfileSetupWizardDraft(baseDraft(), {})).toBeNull();
  });

  it('reconciles history and comorbidity helpers', () => {
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
    expect(getPreviousProfileSetupWizardStep('name')).toBeNull();
  });
});
