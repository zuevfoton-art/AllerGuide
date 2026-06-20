import { getDb } from '@/src/db/init';
import type { Scenario } from '@allerguide/core';
import type { ThemeMode } from '@/src/constants/theme';

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
