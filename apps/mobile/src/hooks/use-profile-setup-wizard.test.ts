import { describe, expect, it } from 'vitest';
import {
  buildProfileSetupWizardNavOptions,
  getNextProfileSetupWizardStep,
  getPreviousProfileSetupWizardStep,
  PROFILE_SETUP_WIZARD_STEP_COUNT,
  reconcileComorbidityLinks,
  reconcileConditionHistoryDrafts,
  shouldSkipComorbidityStep,
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

describe('profile setup wizard', () => {
  it('defines eight ordered steps including comorbidity and phenotype summary', () => {
    expect(PROFILE_SETUP_WIZARD_STEP_COUNT).toBe(8);
    expect(getNextProfileSetupWizardStep('name')).toBe('birthYear');
    expect(getNextProfileSetupWizardStep('conditions')).toBe('conditionHistory');
    expect(getNextProfileSetupWizardStep('conditionHistory')).toBe('comorbidity');
    expect(getNextProfileSetupWizardStep('allergens')).toBe('phenotypeSummary');
    expect(getNextProfileSetupWizardStep('contacts')).toBeNull();
    const fullNav = buildProfileSetupWizardNavOptions({
      conditions: ['food', 'asthma'],
    });
    expect(getPreviousProfileSetupWizardStep('allergens', fullNav)).toBe('comorbidity');
    expect(getPreviousProfileSetupWizardStep('name')).toBeNull();
  });

  it('skips condition history when no conditions selected', () => {
    const nav = buildProfileSetupWizardNavOptions({ conditions: [] });
    expect(nav.skipConditionHistory).toBe(true);
    expect(getNextProfileSetupWizardStep('conditions', nav)).toBe('allergens');
    expect(getPreviousProfileSetupWizardStep('allergens', nav)).toBe('conditions');
  });

  it('skips comorbidity when fewer than two conditions', () => {
    expect(shouldSkipComorbidityStep({ conditions: ['food'] })).toBe(true);
    const nav = buildProfileSetupWizardNavOptions({ conditions: ['food'] });
    expect(getNextProfileSetupWizardStep('conditionHistory', nav)).toBe('allergens');
  });

  it('skips phenotype summary when no conditions', () => {
    expect(shouldSkipPhenotypeSummaryStep({ conditions: [] })).toBe(true);
    const nav = buildProfileSetupWizardNavOptions({ conditions: [] });
    expect(getNextProfileSetupWizardStep('allergens', nav)).toBe('contacts');
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

  it('reconciles comorbidity links when conditions change', () => {
    const links = reconcileComorbidityLinks(
      ['food'],
      [{ fromConditionId: 'food', toConditionId: 'asthma', relation: 'preceded' }],
    );
    expect(links).toEqual([]);
  });
});
