import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './locales/ru';
import en from './locales/en';

const resources = {
  ru: { translation: ru },
  en: { translation: en },
};

export function initI18n() {
  if (i18n.isInitialized) return i18n;

  void i18n.use(initReactI18next).init({
    resources,
    lng: 'ru',
    fallbackLng: 'ru',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });

  return i18n;
}

export default i18n;
