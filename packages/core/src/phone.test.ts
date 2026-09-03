import { describe, expect, it } from 'vitest';
import {
  formatNationalNumber,
  formatPhoneDisplay,
  normalizePhone,
  parsePhone,
  toE164,
  validatePhone,
} from './phone';

describe('phone', () => {
  it('formats RU national number with operator groups', () => {
    expect(formatNationalNumber('9991234567', 'RU')).toBe('(999) 123-45-67');
    expect(formatPhoneDisplay('7', '9991234567', 'RU')).toBe('+7 (999) 123-45-67');
  });

  it('normalizes to E.164', () => {
    expect(toE164('7', '9991234567')).toBe('+79991234567');
    expect(normalizePhone('+7 (999) 123-45-67')).toBe('+79991234567');
    expect(normalizePhone('8 999 123-45-67')).toBe('+79991234567');
  });

  it('parses preferred country for dial code 7', () => {
    const parsed = parsePhone('+79991234567', 'RU');
    expect(parsed.countryIso2).toBe('RU');
    expect(parsed.nationalDigits).toBe('9991234567');
  });

  it('validates national length', () => {
    expect(validatePhone('+79991234567')).toBeNull();
    expect(validatePhone('9991234567')).toBeNull();
    expect(validatePhone('+7999')).toMatch(/корректный/);
    expect(validatePhone('')).toMatch(/Введите/);
  });
});
