import { normalizePhone, validatePhone } from './phone';
import { evaluatePasswordStrength } from './password-strength';

export type LoginType = 'email' | 'phone';

export interface AuthUser {
  id: number;
  login: string;
  loginType: LoginType;
}

export interface ValidatePasswordOptions {
  login?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_EMPTY = 'Введите пароль.';
export const NEW_PASSWORD_TOO_SHORT = 'Пароль должен содержать минимум 8 символов.';
export const PASSWORD_TOO_SIMPLE =
  'Пароль должен содержать минимум 3 типа символов из 4: строчные и заглавные буквы, цифры, спецсимволы.';
export const PASSWORD_TOO_COMMON = 'Этот пароль слишком простой — придумайте другой.';
export const PASSWORD_LIKE_LOGIN = 'Пароль не должен повторять логин.';
export const PASSWORDS_DO_NOT_MATCH = 'Пароли не совпадают.';

export function normalizeLogin(loginType: LoginType, login: string): string {
  const trimmed = login.trim();
  if (loginType === 'email') return trimmed.toLowerCase();
  return normalizePhone(trimmed);
}

export function validateLogin(loginType: LoginType, login: string): string | null {
  if (loginType === 'email') {
    const normalized = normalizeLogin(loginType, login);
    if (!normalized) return 'Введите email.';
    if (!EMAIL_RE.test(normalized)) return 'Введите корректный email.';
    return null;
  }

  return validatePhone(login);
}

export function validatePassword(
  password: string,
  confirmPassword?: string,
  options?: ValidatePasswordOptions,
): string | null {
  if (!password) return PASSWORD_EMPTY;

  const strength = evaluatePasswordStrength(password, options);
  if (strength.failedRules.includes('minLength')) return NEW_PASSWORD_TOO_SHORT;
  if (strength.failedRules.includes('characterClasses')) return PASSWORD_TOO_SIMPLE;
  if (strength.failedRules.includes('notCommon')) return PASSWORD_TOO_COMMON;
  if (strength.failedRules.includes('notLikeLogin')) return PASSWORD_LIKE_LOGIN;

  if (confirmPassword != null && password !== confirmPassword) {
    return PASSWORDS_DO_NOT_MATCH;
  }
  return null;
}

/** Login accepts existing shorter passwords; length is enforced only on new ones. */
export function validateLoginPassword(password: string): string | null {
  if (!password) return PASSWORD_EMPTY;
  return null;
}

export function validateAuthForm(input: {
  loginType: LoginType;
  login: string;
  password: string;
  confirmPassword?: string;
}): string | null {
  return (
    validateLogin(input.loginType, input.login) ??
    validatePassword(input.password, input.confirmPassword, { login: input.login })
  );
}
