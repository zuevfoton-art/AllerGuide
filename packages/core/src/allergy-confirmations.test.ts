import { describe, expect, it } from 'vitest';
import {
  cycleConfirmationSource,
  normalizeAllergyConfirmations,
  parseAllergyConfirmations,
  serializeAllergyConfirmations,
} from './allergy-confirmations';

describe('allergy confirmations', () => {
  it('parses and serializes confirmation map', () => {
    const json = serializeAllergyConfirmations({
      milk: 'specific_ige',
      peanut: 'clinician',
    });
    expect(parseAllergyConfirmations(json)).toEqual({
      milk: 'specific_ige',
      peanut: 'clinician',
    });
  });

  it('defaults missing allergens to self_reported', () => {
    expect(normalizeAllergyConfirmations(['milk', 'eggs'], { milk: 'clinician' })).toEqual({
      milk: 'clinician',
      eggs: 'self_reported',
    });
  });

  it('cycles confirmation sources', () => {
    expect(cycleConfirmationSource('self_reported')).toBe('specific_ige');
    expect(cycleConfirmationSource('specific_ige')).toBe('clinician');
    expect(cycleConfirmationSource('clinician')).toBe('self_reported');
  });

  it('migrates legacy label keys to ids', () => {
    const parsed = parseAllergyConfirmations('{"Молоко":"specific_ige"}');
    expect(parsed.milk).toBe('specific_ige');
  });
});
