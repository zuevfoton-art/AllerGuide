import { describe, expect, it } from 'vitest';
import {
  NEW_PASSWORD_TOO_SHORT,
  PASSWORD_LIKE_LOGIN,
  PASSWORD_TOO_COMMON,
  PASSWORD_TOO_SIMPLE,
  PASSWORDS_DO_NOT_MATCH,
  normalizeLogin,
  validateAuthForm,
  validateLogin,
  validateLoginPassword,
  validatePassword,
} from './auth';

describe('normalizeLogin', () => {
  it('lowercases email', () => {
    expect(normalizeLogin('email', 'User@Mail.COM')).toBe('user@mail.com');
  });

  it('strips phone formatting', () => {
    expect(normalizeLogin('phone', '+7 (999) 123-45-67')).toBe('+79991234567');
  });
});

describe('validateLogin', () => {
  it('accepts valid email', () => {
    expect(validateLogin('email', 'user@example.com')).toBeNull();
  });

  it('rejects invalid phone', () => {
    expect(validateLogin('phone', '123')).not.toBeNull();
  });
});

describe('validateAuthForm', () => {
  it('requires matching passwords on registration', () => {
    expect(
      validateAuthForm({
        loginType: 'email',
        login: 'user@example.com',
        password: 'Secret12!',
        confirmPassword: 'Secret13!',
      }),
    ).toBe(PASSWORDS_DO_NOT_MATCH);
  });

  it('rejects a new password shorter than 8 characters', () => {
    expect(validatePassword('Secret1')).toBe(NEW_PASSWORD_TOO_SHORT);
  });

  it('rejects a password with fewer than 3 character classes', () => {
    expect(validatePassword('secret12')).toBe(PASSWORD_TOO_SIMPLE);
  });

  it('rejects a popular password that otherwise meets the class rules', () => {
    expect(validatePassword('Password1!')).toBe(PASSWORD_TOO_COMMON);
  });

  it('rejects a password that repeats the login', () => {
    expect(validatePassword('Marina12!', undefined, { login: 'marina@example.com' })).toBe(
      PASSWORD_LIKE_LOGIN,
    );
  });

  it('accepts a policy-compliant password', () => {
    expect(validatePassword('Secret12!')).toBeNull();
  });

  it('lets an existing shorter password through on login', () => {
    expect(validateLoginPassword('secret1')).toBeNull();
    expect(validateLoginPassword('')).toBe('Введите пароль.');
  });

  it('passes login into password checks on the registration form', () => {
    expect(
      validateAuthForm({
        loginType: 'email',
        login: 'marina@example.com',
        password: 'Marina12!',
        confirmPassword: 'Marina12!',
      }),
    ).toBe(PASSWORD_LIKE_LOGIN);
  });
});
