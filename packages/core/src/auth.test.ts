import { describe, expect, it } from 'vitest';
import { normalizeLogin, validateAuthForm, validateLogin } from './auth';

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
        password: 'secret1',
        confirmPassword: 'secret2',
      }),
    ).toBe('Пароли не совпадают.');
  });
});
