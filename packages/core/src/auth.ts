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
  return trimmed.replace(/[^\d+]/g, '');
}

export function validateLogin(loginType: LoginType, login: string): string | null {
  const normalized = normalizeLogin(loginType, login);

  if (!normalized) {
    return loginType === 'email' ? 'Введите email.' : 'Введите номер телефона.';
  }

  if (loginType === 'email' && !EMAIL_RE.test(normalized)) {
    return 'Введите корректный email.';
  }

  if (loginType === 'phone') {
    const digits = normalized.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      return 'Введите корректный номер телефона.';
    }
  }

  return null;
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
