import { describe, expect, it } from 'vitest';
import { parseProfileId, parseProfileInput } from './profile-input';

describe('parseProfileId', () => {
  it.each(['', '0', '-1', '1.5', 'abc', '9007199254740992'])(
    'rejects invalid id %j',
    (rawId) => {
      expect(parseProfileId(rawId)).toBeNull();
    },
  );

  it('accepts a positive safe integer', () => {
    expect(parseProfileId('42')).toBe(42);
  });
});

describe('parseProfileInput', () => {
  const validInput = {
    name: '  Анна  ',
    birthYear: 1990,
    type: 'self',
    allergies: ['milk'],
    allergyConfirmations: { milk: 'clinician' },
    crossReactionAllergies: ['goat-milk'],
  };

  it('normalizes the name and preserves typed optional fields', () => {
    expect(parseProfileInput(validInput)).toEqual({
      ...validInput,
      name: 'Анна',
      childConsent: undefined,
      scenario: undefined,
    });
  });

  it.each([
    null,
    { ...validInput, name: '   ' },
    { ...validInput, birthYear: '1990' },
    { ...validInput, birthYear: 1990.5 },
    { ...validInput, type: 'admin' },
    { ...validInput, allergies: ['milk', 1] },
    { ...validInput, allergyConfirmations: { milk: 'untrusted' } },
    { ...validInput, crossReactionAllergies: 'goat-milk' },
    { ...validInput, childConsent: 'yes' },
    { ...validInput, scenario: 'unknown' },
  ])('rejects malformed payload %#', (payload) => {
    expect(parseProfileInput(payload)).toBeNull();
  });
});
