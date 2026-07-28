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

export function validatePassword(password: string, confirmPassword?: string): string | null {
  if (!password) return 'Введите пароль.';
  if (password.length < 6) return 'Пароль должен содержать минимум 6 символов.';
  if (confirmPassword != null && password !== confirmPassword) {
    return 'Пароли не совпадают.';
  }
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
