import { describe, expect, it } from 'vitest';
import {
  getWizardStep,
  parseAllergies,
  resolveBootstrapRoute,
  shouldCompleteOnboarding,
} from './onboarding';

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
