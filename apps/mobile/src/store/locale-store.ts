import { create } from 'zustand';
import { getLocaleContent, type LocaleContent } from '@/src/i18n/content';
import { LOCALE_MESSAGES } from '@/src/i18n/locales';
import {
  translate,
  translateAuthError,
  translateDiaryValidationError,
  translateProfileError,
  translateSosContactError,
  type TranslationKey,
} from '@/src/i18n/translate';
import type { AppLocale } from '@/src/i18n/types';
import { DEFAULT_LOCALE } from '@/src/i18n/types';
import { getLocale, setLocale as persistLocale } from '@/src/services/settings-service';
import { reconcileAllReminders } from '@/src/services/reminder-reconcile-service';
import { trackEvent } from '@/src/services/analytics-service';

interface LocaleState {
  locale: AppLocale;
  hydrated: boolean;
  hydrate: () => void;
  setLocale: (locale: AppLocale) => void;
  t: (key: TranslationKey | string, params?: Record<string, string | number>) => string;
  tAuthError: (error: string) => string;
  tProfileError: (error: string) => string;
  tDiaryError: (error: string) => string;
  tSosError: (error: string) => string;
  content: () => LocaleContent;
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: DEFAULT_LOCALE,
  hydrated: false,
  hydrate: () => {
    const stored = getLocale();
    set({ locale: stored ?? DEFAULT_LOCALE, hydrated: true });
  },
  setLocale: (locale) => {
    persistLocale(locale);
    set({ locale });
    void reconcileAllReminders();
    trackEvent('settings_changed', { setting: 'locale', value: locale });
  },
  t: (key, params) => {
    const messages = LOCALE_MESSAGES[get().locale];
    return translate(messages, key, params);
  },
  tAuthError: (error) => translateAuthError(LOCALE_MESSAGES[get().locale], error),
  tProfileError: (error) => translateProfileError(LOCALE_MESSAGES[get().locale], error),
  tDiaryError: (error) => {
    const locale = get().locale;
    const messages = LOCALE_MESSAGES[locale];
    const content = getLocaleContent(locale);
    if (error === 'Заполните хотя бы один раздел дневника.') {
      return messages.diaryWizard.fillOneSection;
    }
    if (error === 'Введите текст записи.') {
      return messages.diaryWizard.enterEntryText;
    }
    return translateDiaryValidationError(content, error);
  },
  tSosError: (error) => translateSosContactError(LOCALE_MESSAGES[get().locale], error),
  content: () => getLocaleContent(get().locale),
}));

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale);
  const t = useLocaleStore((s) => s.t);
  const tAuthError = useLocaleStore((s) => s.tAuthError);
  const tProfileError = useLocaleStore((s) => s.tProfileError);
  const tDiaryError = useLocaleStore((s) => s.tDiaryError);
  const tSosError = useLocaleStore((s) => s.tSosError);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const content = useLocaleStore((s) => s.content);

  return { locale, t, tAuthError, tProfileError, tDiaryError, tSosError, setLocale, content };
}
