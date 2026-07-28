import { describe, expect, it } from 'vitest';
import {
  buildProfileSetupWizardNavOptions,
  createEmptyProfileSetupWizardDraft,
  getNextProfileSetupWizardStep,
  getVisibleProfileSetupStepProgress,
  PROFILE_SETUP_WIZARD_STEP_COUNT,
  shouldSkipCrossReactionsStep,
  validateProfileSetupWizardDraft,
  type ProfileSetupWizardDraft,
} from './use-profile-setup-wizard';

const baseDraft = (): ProfileSetupWizardDraft => ({
  ...createEmptyProfileSetupWizardDraft('self'),
  name: 'Анна',
  birthYear: '1990',
  selectedAllergenIds: ['milk'],
  conditions: ['food'],
  contacts: [],
});

describe('profile setup wizard (mobile re-export)', () => {
  it('includes symptomBaseline after crossReactions', () => {
    expect(PROFILE_SETUP_WIZARD_STEP_COUNT).toBe(10);
    expect(getNextProfileSetupWizardStep('crossReactions')).toBe('symptomBaseline');
    expect(shouldSkipCrossReactionsStep({ selectedAllergenIds: ['milk'] })).toBe(false);
  });

  it('computes visible progress with symptom step', () => {
    expect(
      getVisibleProfileSetupStepProgress('allergens', {
        conditions: [],
        selectedAllergenIds: ['unknown-allergen-xyz'],
      }),
    ).toEqual({ current: 4, total: 6 });
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
