import type { LocaleMessages } from './types';

export type TranslationKey = string;

export function getMessage(messages: LocaleMessages, key: string): string {
  const parts = key.split('.');
  let current: unknown = messages;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') return key;
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === 'string' ? current : key;
}

export function formatMessage(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    params[name] != null ? String(params[name]) : `{{${name}}}`,
  );
}

export function translate(
  messages: LocaleMessages,
  key: string,
  params?: Record<string, string | number>,
): string {
  return formatMessage(getMessage(messages, key), params);
}

/** Maps Russian validation strings from @allerguide/core to translation keys */
const AUTH_ERROR_KEY_MAP: Record<string, keyof LocaleMessages['auth']['errors']> = {
  'Введите email.': 'emailRequired',
  'Введите номер телефона.': 'phoneRequired',
  'Введите корректный email.': 'emailInvalid',
  'Введите корректный номер телефона.': 'phoneInvalid',
  'Введите пароль.': 'passwordRequired',
  'Пароль должен содержать минимум 6 символов.': 'passwordMin',
  'Пароли не совпадают.': 'passwordMismatch',
  'Неверный логин или пароль.': 'wrongCredentials',
  'Пользователь с таким email уже зарегистрирован.': 'emailTaken',
  'Пользователь с таким номером уже зарегистрирован.': 'phoneTaken',
  'Не удалось создать аккаунт.': 'createFailed',
};

export function translateAuthError(messages: LocaleMessages, error: string): string {
  const mapped = AUTH_ERROR_KEY_MAP[error];
  if (mapped) return messages.auth.errors[mapped];
  return error;
}
