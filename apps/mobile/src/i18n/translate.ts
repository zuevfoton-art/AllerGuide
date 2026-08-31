import type { ScanResult } from '@allerguide/ai';
import type { LocaleContent } from './content/types';
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
  // Also support single-brace {key} for content templates
}

export function formatTemplate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
  }
  return result;
}

export function translate(
  messages: LocaleMessages,
  key: string,
  params?: Record<string, string | number>,
): string {
  return formatMessage(getMessage(messages, key), params);
}

const AUTH_ERROR_KEY_MAP: Record<string, keyof LocaleMessages['auth']['errors']> = {
  'Введите телефон или email.': 'loginRequired',
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
  'Произошла непредвиденная ошибка. Попробуйте ещё раз.': 'unexpected',
};

export function translateAuthError(messages: LocaleMessages, error: string): string {
  const mapped = AUTH_ERROR_KEY_MAP[error];
  if (mapped) return messages.auth.errors[mapped];
  return error;
}

const PROFILE_ERROR_KEY_MAP: Record<string, keyof LocaleMessages['profileSetup']['errors']> = {
  name_required: 'nameRequired',
  birth_year_invalid: 'birthYearInvalid',
  allergen_required: 'allergenRequired',
  conditions_required: 'conditionsRequired',
  child_consent_required: 'consentRequired',
  'Укажите имя профиля.': 'nameRequired',
  'Укажите корректный год рождения.': 'birthYearInvalid',
  'Выберите хотя бы один аллерген.': 'allergenRequired',
  'Подтвердите, что вы являетесь родителем или законным представителем ребёнка.': 'consentRequired',
};

export function translateProfileError(messages: LocaleMessages, error: string): string {
  const mapped = PROFILE_ERROR_KEY_MAP[error];
  if (mapped) return messages.profileSetup.errors[mapped];
  return error;
}

export function translateDiaryValidationError(content: LocaleContent, error: string): string {
  const fillMatch = error.match(/^Заполните поле «(.+)»\.$/);
  if (fillMatch) {
    return formatTemplate(content.diaryValidation.fillField, { label: fillMatch[1] });
  }
  if (error === 'Заполните хотя бы один раздел дневника.') {
    return error;
  }
  return error;
}

export function localizeScanResult(result: ScanResult, content: LocaleContent): ScanResult {
  const verdict = content.scanner.verdicts[result.verdict] ?? result.verdict;
  let reason = result.reason;

  const traceSuffix = content.scanner.traceSuffix;
  const crossSuffix = content.scanner.crossSuffix;

  if (result.level === 'high' && content.scanner.reasons.high) {
    reason = formatTemplate(content.scanner.reasons.high, {
      productSuffix: result.productName ? ` in «${result.productName}»` : '',
      matches: [...result.matches, ...result.crossMatches, ...(result.traceMatches ?? [])].join(', '),
    });
  } else if (result.level === 'medium' && content.scanner.reasons.medium) {
    const label = result.matches[0] ?? result.crossMatches[0] ?? result.traceMatches?.[0] ?? '';
    reason = formatTemplate(content.scanner.reasons.medium, {
      productSuffix: result.productName ? ` in «${result.productName}»` : '',
      label,
    });
  } else if (result.level === 'low' && content.scanner.reasons.low) {
    reason = formatTemplate(content.scanner.reasons.low, {
      productSuffix: result.productName ? ` in «${result.productName}»` : '',
    });
  }

  const crossMatches = result.crossMatches.map((item) => {
    if (item.includes('(перекр. реакция)')) {
      return item.replace('(перекр. реакция)', crossSuffix);
    }
    return item;
  });

  const traceMatches = (result.traceMatches ?? []).map((item) => {
    if (item.includes('(следы / may contain)')) {
      return item.replace('(следы / may contain)', traceSuffix);
    }
    return item;
  });

  return { ...result, verdict, reason, crossMatches, traceMatches };
}

export function translateSelectProfileError(messages: LocaleMessages, error: string): string {
  if (error === 'Выберите профиль на главном экране.') {
    return messages.errors.selectProfile;
  }
  return error;
}

export function translateSosContactError(messages: LocaleMessages, error: string): string {
  if (error === 'Укажите имя и телефон контакта.') {
    return messages.sosEdit.errors.contactRequired;
  }
  return translateSelectProfileError(messages, error);
}
