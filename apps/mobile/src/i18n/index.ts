import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './locales/ru';
import en from './locales/en';

const resources = {
  ru: { translation: ru },
  en: { translation: en },
};

export function initI18n() {
  if (i18next.isInitialized) return i18next;

  // i18next exposes `use` as both an instance method and a named export; we want
  // the instance method here.
  // eslint-disable-next-line import/no-named-as-default-member
  void i18next.use(initReactI18next).init({
    resources,
    lng: 'ru',
    fallbackLng: 'ru',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });

  return i18next;
}

export default i18next;
