import type { AppLocale } from '../types';
import type { LocaleContent } from './types';
import ruContent from './ru';
import enContent from './en';
import esContent from './es';
import frContent from './fr';
import deContent from './de';
import itContent from './it';

export const LOCALE_CONTENT: Record<AppLocale, LocaleContent> = {
  ru: ruContent,
  en: enContent,
  es: esContent,
  fr: frContent,
  de: deContent,
  it: itContent,
};

export function getLocaleContent(locale: AppLocale): LocaleContent {
  return LOCALE_CONTENT[locale] ?? LOCALE_CONTENT.ru;
}

export * from './localize';
export type { LocaleContent } from './types';
