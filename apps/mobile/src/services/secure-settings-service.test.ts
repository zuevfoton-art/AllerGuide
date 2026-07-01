import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const settings = new Map<string, string>();
const secureStore = new Map<string, string>();

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: (key: string) => Promise.resolve(secureStore.get(key) ?? null),
  setItemAsync: (key: string, value: string) => {
    secureStore.set(key, value);
    return Promise.resolve();
  },
  deleteItemAsync: (key: string) => {
    secureStore.delete(key);
    return Promise.resolve();
  },
}));

vi.mock('@/src/services/settings-service', () => ({
  getSetting: (key: string) => settings.get(key) ?? null,
  setSetting: (key: string, value: string) => {
    if (value) settings.set(key, value);
    else settings.delete(key);
  },
}));

describe('secure-settings-service', () => {
  beforeEach(() => {
    settings.clear();
    secureStore.clear();
    vi.resetModules();
  });

  afterEach(async () => {
    const { __resetSensitiveSettingsCacheForTests } = await import('./secure-settings-service');
    __resetSensitiveSettingsCacheForTests();
  });

  it('migrates legacy SQLite recovery key into SecureStore', async () => {
    settings.set('recoveryKey', 'a'.repeat(64));

    const { hydrateSensitiveSettings, getSensitiveSetting } = await import('./secure-settings-service');
    await hydrateSensitiveSettings();

    expect(secureStore.get('recoveryKey')).toBe('a'.repeat(64));
    expect(settings.has('recoveryKey')).toBe(false);
    expect(getSensitiveSetting('recoveryKey')).toBe('a'.repeat(64));
  });

  it('does not mirror sensitive values back to SQLite on write', async () => {
    const { setSensitiveSettingSync, getSensitiveSetting } = await import('./secure-settings-service');
    setSensitiveSettingSync('authToken', 'jwt-secret');

    expect(getSensitiveSetting('authToken')).toBe('jwt-secret');
    expect(settings.has('authToken')).toBe(false);
    expect(secureStore.get('authToken')).toBe('jwt-secret');
  });
});
