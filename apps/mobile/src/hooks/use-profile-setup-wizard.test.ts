import { describe, expect, it } from 'vitest';
import {
  getNextProfileSetupWizardStep,
  getPreviousProfileSetupWizardStep,
  PROFILE_SETUP_WIZARD_STEP_COUNT,
  reconcileConditionHistoryDrafts,
  shouldSkipConditionHistoryStep,
  validateProfileSetupWizardDraft,
  validateProfileSetupWizardStep,
  type ProfileSetupWizardDraft,
} from './use-profile-setup-wizard';

const baseDraft = (): ProfileSetupWizardDraft => ({
  name: 'Анна',
  birthYear: '1990',
  selectedAllergenIds: ['milk'],
  confirmations: {},
  conditions: [],
  conditionHistoryDrafts: {},
  contacts: [],
  childConsent: false,
  profileType: 'self',
});

describe('profile setup wizard', () => {
  it('defines six ordered steps including condition history', () => {
    expect(PROFILE_SETUP_WIZARD_STEP_COUNT).toBe(6);
    expect(getNextProfileSetupWizardStep('name')).toBe('birthYear');
    expect(getNextProfileSetupWizardStep('conditions')).toBe('conditionHistory');
    expect(getNextProfileSetupWizardStep('contacts')).toBeNull();
    expect(getPreviousProfileSetupWizardStep('allergens')).toBe('conditionHistory');
    expect(getPreviousProfileSetupWizardStep('name')).toBeNull();
  });

  it('skips condition history when no conditions selected', () => {
    expect(shouldSkipConditionHistoryStep({ conditions: [] })).toBe(true);
    expect(getNextProfileSetupWizardStep('conditions', { skipConditionHistory: true })).toBe(
      'allergens',
    );
    expect(getPreviousProfileSetupWizardStep('allergens', { skipConditionHistory: true })).toBe(
      'conditions',
    );
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

  it('requires at least one allergen', () => {
    expect(
      validateProfileSetupWizardStep('allergens', { ...baseDraft(), selectedAllergenIds: [] }, {}),
    ).toBe('allergen_required');
  });

  it('validates full draft before save', () => {
    expect(validateProfileSetupWizardDraft(baseDraft(), {})).toBeNull();
    expect(
      validateProfileSetupWizardDraft({ ...baseDraft(), selectedAllergenIds: [] }, {}),
    ).toBe('allergen_required');
  });

  it('reconciles condition history drafts when conditions change', () => {
    const drafts = reconcileConditionHistoryDrafts(['food', 'asthma'], {
      food: { onsetKind: 'infancy', status: 'active', diagnosedBy: 'self_reported' },
    });
    expect(Object.keys(drafts)).toEqual(['food', 'asthma']);
    expect(drafts.asthma?.onsetKind).toBe('unknown');
  });
});
