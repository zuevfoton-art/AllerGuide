import { describe, expect, it } from 'vitest';
import {
  getWizardStep,
  parseAllergies,
  resolveAuthedBootstrapRoute,
  resolveBootstrapRoute,
  resolvePreferredActiveProfile,
  shouldCompleteOnboarding,
  sortProfilesForDisplay,
} from './onboarding';

const selfProfile = { id: 1, name: 'A', birthYear: 1990, type: 'self' as const, allergies: '[]' };
const childProfile = { id: 2, name: 'B', birthYear: 2015, type: 'child' as const, allergies: '[]' };

describe('parseAllergies', () => {
  it('parses valid JSON array', () => {
    expect(parseAllergies('["Молоко","Арахис"]')).toEqual(['Молоко', 'Арахис']);
  });

  it('returns empty array for invalid JSON', () => {
    expect(parseAllergies('not-json')).toEqual([]);
  });
});

describe('getWizardStep', () => {
  it('returns self when both scenario and no self profile', () => {
    expect(getWizardStep('both', [])).toBe('self');
  });

  it('returns child when self exists but child missing', () => {
    expect(
      getWizardStep('both', [{ id: 1, name: 'A', birthYear: 1990, type: 'self', allergies: '[]' }]),
    ).toBe('child');
  });

  it('returns null when both profiles exist', () => {
    expect(
      getWizardStep('both', [
        { id: 1, name: 'A', birthYear: 1990, type: 'self', allergies: '[]' },
        { id: 2, name: 'B', birthYear: 2015, type: 'child', allergies: '[]' },
      ]),
    ).toBeNull();
  });
});

describe('resolveBootstrapRoute', () => {
  it('sends new users to onboarding', () => {
    expect(resolveBootstrapRoute([], null, false)).toBe('/onboarding');
  });

  it('sends completed users to home', () => {
    expect(
      resolveBootstrapRoute(
        [{ id: 1, name: 'A', birthYear: 1990, type: 'self', allergies: '[]' }],
        'self',
        true,
      ),
    ).toBe('/(tabs)/home');
  });

  it('resumes both wizard when child profile missing', () => {
    expect(
      resolveBootstrapRoute(
        [{ id: 1, name: 'A', birthYear: 1990, type: 'self', allergies: '[]' }],
        'both',
        false,
      ),
    ).toBe('/profile-setup');
  });
});

describe('resolveAuthedBootstrapRoute', () => {
  it('sends a returning user with a profile straight to home, even on a fresh install (intro/onboarding flags false)', () => {
    expect(resolveAuthedBootstrapRoute([selfProfile], 'self', false, false)).toBe('/(tabs)/home');
  });

  it('shows the intro tour to a brand-new user with no profiles', () => {
    expect(resolveAuthedBootstrapRoute([], null, false, false)).toBe('/onboarding-intro');
  });

  it('sends a new user who finished the intro to scenario onboarding', () => {
    expect(resolveAuthedBootstrapRoute([], null, true, false)).toBe('/onboarding');
  });

  it('resumes the both-wizard for a user missing the child profile', () => {
    expect(resolveAuthedBootstrapRoute([selfProfile], 'both', false, false)).toBe('/profile-setup');
  });

  it('sends a user with both profiles to home', () => {
    expect(resolveAuthedBootstrapRoute([selfProfile, childProfile], 'both', false, true)).toBe(
      '/(tabs)/home',
    );
  });
});

describe('resolvePreferredActiveProfile', () => {
  it('prefers self/parent over a newer child profile', () => {
    expect(resolvePreferredActiveProfile([childProfile, selfProfile])).toEqual(selfProfile);
  });

  it('falls back to the oldest child when no self profile exists', () => {
    const olderChild = { ...childProfile, id: 3, name: 'C' };
    expect(resolvePreferredActiveProfile([olderChild, childProfile])).toEqual(childProfile);
  });

  it('returns null for an empty list', () => {
    expect(resolvePreferredActiveProfile([])).toBeNull();
  });

  it('sorts self first for display', () => {
    expect(sortProfilesForDisplay([childProfile, selfProfile]).map((p) => p.type)).toEqual([
      'self',
      'child',
    ]);
  });
});

describe('shouldCompleteOnboarding', () => {
  it('requires two profile types for both scenario', () => {
    expect(
      shouldCompleteOnboarding('both', [
        { id: 1, name: 'A', birthYear: 1990, type: 'self', allergies: '[]' },
      ]),
    ).toBe(false);

    expect(
      shouldCompleteOnboarding('both', [
        { id: 1, name: 'A', birthYear: 1990, type: 'self', allergies: '[]' },
        { id: 2, name: 'B', birthYear: 2015, type: 'child', allergies: '[]' },
      ]),
    ).toBe(true);
  });
});
