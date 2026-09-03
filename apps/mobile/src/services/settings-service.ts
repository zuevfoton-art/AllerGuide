import { getDb } from '@/src/db/init';
import type { Scenario } from '@allerguide/core';
import type { ThemeMode } from '@/src/constants/theme';
import type { AppLocale } from '@/src/i18n/types';
import { APP_LOCALES } from '@/src/i18n/types';

export function getSetting(key: string): string | null {
  const db = getDb();
  const row = db.getFirstSync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  const db = getDb();
  db.runSync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [key, value]);
}

export function getStoredScenario(): Scenario | null {
  const value = getSetting('scenario');
  if (value === 'self' || value === 'child' || value === 'both') return value;
  return null;
}

export function setStoredScenario(scenario: Scenario) {
  setSetting('scenario', scenario);
}

export function isOnboardingComplete(): boolean {
  return getSetting('onboardingComplete') === 'true';
}

export function markOnboardingComplete() {
  setSetting('onboardingComplete', 'true');
}

export function isIntroComplete(): boolean {
  return getSetting('introComplete') === 'true';
}

export function markIntroComplete() {
  setSetting('introComplete', 'true');
}

export function getThemeMode(): ThemeMode | null {
  const value = getSetting('themeMode');
  if (value === 'light' || value === 'dark' || value === 'system') return value;
  return null;
}

export function setThemeMode(mode: ThemeMode) {
  setSetting('themeMode', mode);
}

export function getLocale(): AppLocale | null {
  const value = getSetting('locale');
  if (value && (APP_LOCALES as readonly string[]).includes(value)) {
    return value as AppLocale;
  }
  return null;
}

export function setLocale(locale: AppLocale) {
  setSetting('locale', locale);
}

const ACTIVE_PROFILE_ID_KEY = 'activeProfileId';

/** Last profile the user selected — durable, unlike session Zustand. */
export function getStoredActiveProfileId(): number | null {
  const value = getSetting(ACTIVE_PROFILE_ID_KEY);
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function setStoredActiveProfileId(id: number | null) {
  setSetting(ACTIVE_PROFILE_ID_KEY, id != null && id > 0 ? String(id) : '');
}
