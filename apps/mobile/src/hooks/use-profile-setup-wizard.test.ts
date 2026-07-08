import { describe, expect, it } from 'vitest';
import {
  getNextProfileSetupWizardStep,
  getPreviousProfileSetupWizardStep,
  PROFILE_SETUP_WIZARD_STEP_COUNT,
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
  contacts: [],
  childConsent: false,
  profileType: 'self',
});

describe('profile setup wizard', () => {
  it('defines five ordered steps', () => {
    expect(PROFILE_SETUP_WIZARD_STEP_COUNT).toBe(5);
    expect(getNextProfileSetupWizardStep('name')).toBe('birthYear');
    expect(getNextProfileSetupWizardStep('contacts')).toBeNull();
    expect(getPreviousProfileSetupWizardStep('allergens')).toBe('conditions');
    expect(getPreviousProfileSetupWizardStep('name')).toBeNull();
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
});
