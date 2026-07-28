import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getSetting, setSetting } from '@/src/services/settings-service';
import { logCaughtError } from '@/src/services/error-reporting';

/** Keys stored in OS secure enclave on native (never mirrored to SQLite). */
export const SENSITIVE_SETTING_KEYS = [
  'authToken',
  'recoveryKey',
  'backupSecret',
  'recoveryKeyConfirmed',
] as const;

export type SensitiveSettingKey = (typeof SENSITIVE_SETTING_KEYS)[number];

const cache = new Map<string, string>();

export function getSensitiveSetting(key: SensitiveSettingKey | string): string | null {
  if (Platform.OS === 'web') return getSetting(key);
  return cache.get(key) ?? null;
}

export function setSensitiveSettingSync(key: SensitiveSettingKey | string, value: string): void {
  if (Platform.OS === 'web') {
    setSetting(key, value);
    return;
  }
  cache.set(key, value);
  setSetting(key, '');
  void SecureStore.setItemAsync(key, value);
}

export async function deleteSensitiveSetting(key: SensitiveSettingKey | string): Promise<void> {
  if (Platform.OS === 'web') {
    setSetting(key, '');
    return;
  }
  cache.delete(key);
  setSetting(key, '');
  await SecureStore.deleteItemAsync(key).catch((error) => {
    logCaughtError('deleteSensitiveSetting', error, { level: 'warn', extra: { key } });
  });
}

/** Load secure values from SecureStore; migrate legacy SQLite copies. Call before auth/sync. */
export async function hydrateSensitiveSettings(): Promise<void> {
  if (Platform.OS === 'web') return;

  for (const key of SENSITIVE_SETTING_KEYS) {
    const legacy = getSetting(key);
    const stored = await SecureStore.getItemAsync(key);

    if (stored) {
      cache.set(key, stored);
      if (legacy) setSetting(key, '');
      continue;
    }

    if (legacy) {
      cache.set(key, legacy);
      await SecureStore.setItemAsync(key, legacy);
      setSetting(key, '');
    }
  }
}

/** @internal test helper */
export function __resetSensitiveSettingsCacheForTests(): void {
  cache.clear();
}
