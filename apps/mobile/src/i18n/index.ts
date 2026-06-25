import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './locales/ru';
import en from './locales/en';

const resources = {
  ru: { translation: ru },
  en: { translation: en },
};

const i18next = createInstance();

export function initI18n() {
  if (i18next.isInitialized) return i18next;

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
