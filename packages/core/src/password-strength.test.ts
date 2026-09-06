import { describe, expect, it } from 'vitest';
import {
  collectCharacterClasses,
  evaluatePasswordStrength,
  MIN_NEW_PASSWORD_LENGTH,
  REQUIRED_CHARACTER_CLASS_COUNT,
} from './password-strength';

describe('collectCharacterClasses', () => {
  it('detects ASCII and Unicode letter classes', () => {
    expect(collectCharacterClasses('ab')).toEqual(['lowercase']);
    expect(collectCharacterClasses('AB')).toEqual(['uppercase']);
    expect(collectCharacterClasses('Пароль')).toEqual(['lowercase', 'uppercase']);
    expect(collectCharacterClasses('12')).toEqual(['digit']);
    expect(collectCharacterClasses('!@')).toEqual(['symbol']);
  });
});

describe('evaluatePasswordStrength', () => {
  it('keeps the published policy constants', () => {
    expect(MIN_NEW_PASSWORD_LENGTH).toBe(8);
    expect(REQUIRED_CHARACTER_CLASS_COUNT).toBe(3);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = evaluatePasswordStrength('Ab1!');
    expect(result.meetsPolicy).toBe(false);
    expect(result.failedRules).toContain('minLength');
    expect(result.level).toBe('weak');
  });

  it('rejects a long password with fewer than 3 character classes', () => {
    const result = evaluatePasswordStrength('secret12');
    expect(result.satisfiedClasses).toEqual(['lowercase', 'digit']);
    expect(result.failedRules).toContain('characterClasses');
    expect(result.meetsPolicy).toBe(false);
  });

  it('accepts 8 characters with 3 of 4 classes as fair', () => {
    const result = evaluatePasswordStrength('Secret12');
    expect(result.meetsPolicy).toBe(true);
    expect(result.satisfiedClasses).toEqual(['lowercase', 'uppercase', 'digit']);
    expect(result.level).toBe('fair');
  });

  it('rates 4 classes under 12 characters as good', () => {
    const result = evaluatePasswordStrength('Secret1!');
    expect(result.meetsPolicy).toBe(true);
    expect(result.satisfiedClasses).toHaveLength(4);
    expect(result.level).toBe('good');
  });

  it('still rejects a long password with only 2 character classes', () => {
    const result = evaluatePasswordStrength('SecretPhrase');
    expect(result.satisfiedClasses).toEqual(['lowercase', 'uppercase']);
    expect(result.failedRules).toContain('characterClasses');
    expect(result.meetsPolicy).toBe(false);
  });

  it('rates 3 classes at length 12 with a digit as good', () => {
    const result = evaluatePasswordStrength('SecretWord1');
    expect(result.meetsPolicy).toBe(true);
    expect(result.satisfiedClasses).toEqual(['lowercase', 'uppercase', 'digit']);
    expect(result.level).toBe('good');
  });

  it('rates 4 classes at length 12 as strong', () => {
    const result = evaluatePasswordStrength('SecretWord1!');
    expect(result.meetsPolicy).toBe(true);
    expect(result.level).toBe('strong');
  });

  it('rates a long 3-class password as strong', () => {
    const result = evaluatePasswordStrength('SecretWordLong1');
    expect(result.meetsPolicy).toBe(true);
    expect(result.satisfiedClasses).toEqual(['lowercase', 'uppercase', 'digit']);
    expect(result.level).toBe('strong');
  });

  it('blocks a popular password even when classes pass', () => {
    const result = evaluatePasswordStrength('Password1!');
    expect(result.failedRules).toContain('notCommon');
    expect(result.meetsPolicy).toBe(false);
    expect(result.level).toBe('weak');
  });

  it('blocks a password that equals the login', () => {
    const result = evaluatePasswordStrength('UserName1!', { login: 'UserName1!' });
    expect(result.failedRules).toContain('notLikeLogin');
    expect(result.meetsPolicy).toBe(false);
  });

  it('blocks a password that contains the email local-part', () => {
    const result = evaluatePasswordStrength('Marina12!', { login: 'marina@example.com' });
    expect(result.failedRules).toContain('notLikeLogin');
    expect(result.meetsPolicy).toBe(false);
  });

  it('allows a short local-part inside the password', () => {
    const result = evaluatePasswordStrength('Secret12!', { login: 'ab@example.com' });
    expect(result.failedRules).not.toContain('notLikeLogin');
    expect(result.meetsPolicy).toBe(true);
  });

  it('does not apply the login rule when login is omitted', () => {
    const result = evaluatePasswordStrength('Secret12!');
    expect(result.failedRules).not.toContain('notLikeLogin');
    expect(result.meetsPolicy).toBe(true);
  });
});
