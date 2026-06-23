import { describe, expect, it } from 'vitest';
import {
  ANAPHYLAXIS_GRADES,
  createDefaultPassport,
  formatPassportText,
  parsePassport,
  serializePassport,
} from './allergy-passport';

describe('allergy passport', () => {
  it('creates default passport with shock kit items', () => {
    const passport = createDefaultPassport();
    expect(passport.v).toBe(1);
    expect(passport.shockKit.length).toBeGreaterThanOrEqual(4);
  });

  it('round-trips passport JSON', () => {
    const passport = createDefaultPassport();
    passport.drugIntolerances = ['Аспирин'];
    passport.triggers = ['Орехи'];
    passport.epinephrine = { brand: 'EpiPen', expiry: '2027-01' };
    passport.shockKit[0].checked = true;

    const parsed = parsePassport(serializePassport(passport));
    expect(parsed.drugIntolerances).toEqual(['Аспирин']);
    expect(parsed.triggers).toEqual(['Орехи']);
    expect(parsed.epinephrine?.brand).toBe('EpiPen');
    expect(parsed.shockKit[0].checked).toBe(true);
  });

  it('formats export text for medical staff', () => {
    const text = formatPassportText({
      profileName: 'Иван',
      profileAge: '8 лет',
      allergies: ['Арахис'],
      passport: {
        ...createDefaultPassport(),
        drugIntolerances: ['Ибупрофен'],
      },
      emergencyNumber: '103',
    });
    expect(text).toContain('Иван');
    expect(text).toContain('Арахис');
    expect(text).toContain('Ибупрофен');
    expect(text).toContain('103');
  });

  it('defines three anaphylaxis grades', () => {
    expect(ANAPHYLAXIS_GRADES).toHaveLength(3);
    expect(ANAPHYLAXIS_GRADES.map((g) => g.grade)).toEqual([1, 2, 3]);
  });
});
