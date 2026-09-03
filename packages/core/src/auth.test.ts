import { describe, expect, it } from 'vitest';
import {
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
        password: 'secret12',
        confirmPassword: 'secret13',
      }),
    ).toBe('Пароли не совпадают.');
  });

  it('rejects a new password shorter than 8 characters', () => {
    expect(validatePassword('secret1')).toBe('Пароль должен содержать минимум 8 символов.');
  });

  it('accepts an 8-character password', () => {
    expect(validatePassword('secret12')).toBeNull();
  });

  it('lets an existing shorter password through on login', () => {
    expect(validateLoginPassword('secret1')).toBeNull();
    expect(validateLoginPassword('')).toBe('Введите пароль.');
  });
});
