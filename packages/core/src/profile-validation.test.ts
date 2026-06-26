import { describe, expect, it } from 'vitest';
import { dedupeAllergenIds, needsChildConsent, validateProfileInput } from './profile-validation';

describe('profile validation', () => {
  it('requires name, birth year and allergens', () => {
    expect(
      validateProfileInput({
        name: '',
        birthYear: 2015,
        type: 'child',
        allergies: ['milk'],
        childConsent: true,
      }),
    ).toBe('name_required');

    expect(
      validateProfileInput({
        name: 'Anna',
        birthYear: 1800,
        type: 'self',
        allergies: ['milk'],
      }),
    ).toBe('birth_year_invalid');

    expect(
      validateProfileInput({
        name: 'Anna',
        birthYear: 2015,
        type: 'self',
        allergies: [],
      }),
    ).toBe('allergen_required');
  });

  it('requires child consent for child profiles', () => {
    expect(
      validateProfileInput({
        name: 'Kid',
        birthYear: 2015,
        type: 'child',
        allergies: ['milk'],
        childConsent: false,
      }),
    ).toBe('child_consent_required');

    expect(
      validateProfileInput({
        name: 'Kid',
        birthYear: 2015,
        type: 'child',
        allergies: ['milk'],
        childConsent: true,
      }),
    ).toBeNull();
  });

  it('deduplicates allergen ids', () => {
    expect(dedupeAllergenIds(['milk', 'Молоко', 'milk'])).toEqual(['milk']);
  });

  it('needs child consent when scenario is child', () => {
    expect(needsChildConsent('self', 'child')).toBe(true);
    expect(needsChildConsent('self', 'self')).toBe(false);
  });
});
