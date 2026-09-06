import { Platform } from 'react-native';
import { getDb } from '@/src/db/init';
import { webCollections } from '@/src/db/web-collections';

export interface SettingsRepository {
  get(key: string): string | null;
  set(key: string, value: string): void;
  getAll(): Record<string, string>;
}

export const webSettingsRepository: SettingsRepository = {
  get(key) {
    return webCollections.getSettings()[key] ?? null;
  },

  set(key, value) {
    const settings = webCollections.getSettings();
    settings[key] = value;
    webCollections.saveSettings(settings);
  },

  getAll() {
    return { ...webCollections.getSettings() };
  },
};

export const sqliteSettingsRepository: SettingsRepository = {
  get(key) {
    const row = getDb().getFirstSync<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?',
      [key],
    );
    return row?.value ?? null;
  },

  set(key, value) {
    getDb().runSync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [
      key,
      value,
    ]);
  },

  getAll() {
    const rows = getDb().getAllSync<{ key: string; value: string }>(
      'SELECT key, value FROM app_settings',
    );
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  },
};

export function getSettingsRepository(): SettingsRepository {
  return Platform.OS === 'web' ? webSettingsRepository : sqliteSettingsRepository;
}
