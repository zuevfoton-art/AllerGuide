import { create } from 'zustand';
import { LOCALE_MESSAGES } from '@/src/i18n/locales';
import { translate, translateAuthError, type TranslationKey } from '@/src/i18n/translate';
import type { AppLocale } from '@/src/i18n/types';
import { DEFAULT_LOCALE } from '@/src/i18n/types';
import { getLocale, setLocale as persistLocale } from '@/src/services/settings-service';

interface LocaleState {
  locale: AppLocale;
  hydrated: boolean;
  hydrate: () => void;
  setLocale: (locale: AppLocale) => void;
  t: (key: TranslationKey | string, params?: Record<string, string | number>) => string;
  tAuthError: (error: string) => string;
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
  },
  t: (key, params) => {
    const messages = LOCALE_MESSAGES[get().locale];
    return translate(messages, key, params);
  },
  tAuthError: (error) => translateAuthError(LOCALE_MESSAGES[get().locale], error),
}));

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale);
  const t = useLocaleStore((s) => s.t);
  const tAuthError = useLocaleStore((s) => s.tAuthError);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return { locale, t, tAuthError, setLocale };
}
