import { normalizePhone, validatePhone } from './phone';

export type LoginType = 'email' | 'phone';

export interface AuthUser {
  id: number;
  login: string;
  loginType: LoginType;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

/** Minimum length for a newly chosen password (register / reset). */
export const MIN_NEW_PASSWORD_LENGTH = 8;

const NEW_PASSWORD_TOO_SHORT = 'Пароль должен содержать минимум 8 символов.';

export function validatePassword(password: string, confirmPassword?: string): string | null {
  if (!password) return 'Введите пароль.';
  if (password.length < MIN_NEW_PASSWORD_LENGTH) return NEW_PASSWORD_TOO_SHORT;
  if (confirmPassword != null && password !== confirmPassword) {
    return 'Пароли не совпадают.';
  }
  return null;
}

/** Login accepts existing shorter passwords; length is enforced only on new ones. */
export function validateLoginPassword(password: string): string | null {
  if (!password) return 'Введите пароль.';
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
    validatePassword(input.password, input.confirmPassword)
  );
}
