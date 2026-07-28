import { describe, expect, it } from 'vitest';
import {
  buildProfileSetupWizardNavOptions,
  createEmptyProfileSetupWizardDraft,
  getNextProfileSetupWizardStep,
  getVisibleProfileSetupStepProgress,
  PROFILE_SETUP_WIZARD_STEP_COUNT,
  shouldSkipCrossReactionsStep,
  validateProfileSetupWizardDraft,
} from './use-profile-setup-wizard';

const baseDraft = () => ({
  ...createEmptyProfileSetupWizardDraft('self'),
  name: 'Анна',
  birthYear: '1990',
  selectedAllergenIds: ['milk'],
  conditions: ['food' as const],
});

describe('profile setup wizard (mobile re-export)', () => {
  it('includes allergenConfirmations after crossReactions', () => {
    expect(PROFILE_SETUP_WIZARD_STEP_COUNT).toBe(11);
    expect(getNextProfileSetupWizardStep('crossReactions')).toBe('allergenConfirmations');
    expect(getNextProfileSetupWizardStep('allergenConfirmations')).toBe('symptomBaseline');
    expect(shouldSkipCrossReactionsStep({ selectedAllergenIds: ['milk'] })).toBe(false);
  });

  it('computes visible progress including allergenConfirmations', () => {
    expect(
      getVisibleProfileSetupStepProgress('allergens', {
        conditions: [],
        selectedAllergenIds: ['unknown-allergen-xyz'],
      }),
    ).toEqual({ current: 4, total: 7 });
  });

  it('validates full draft', () => {
    expect(validateProfileSetupWizardDraft(baseDraft(), {})).toBeNull();
    const nav = buildProfileSetupWizardNavOptions({
      conditions: ['food'],
      selectedAllergenIds: ['milk'],
    });
    expect(nav.skipComorbidity).toBe(true);
  });
});
