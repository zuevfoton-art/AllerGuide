import type { AppLocale } from '../types';
import ru from './ru';
import en from './en';
import es from './es';
import fr from './fr';
import de from './de';
import it from './it';

export const LOCALE_MESSAGES = {
  ru,
  en,
  es,
  fr,
  de,
  it,
} as const satisfies Record<AppLocale, typeof ru>;

export type Messages = typeof ru;
