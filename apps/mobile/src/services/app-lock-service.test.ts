import { beforeEach, describe, expect, it, vi } from 'vitest';

const settings = new Map<string, string>();
const secure = new Map<string, string>();

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Alert: { alert: vi.fn() },
}));

vi.mock('expo-local-authentication', () => ({
  hasHardwareAsync: vi.fn(async () => true),
  isEnrolledAsync: vi.fn(async () => true),
  authenticateAsync: vi.fn(async () => ({ success: true })),
  supportedAuthenticationTypesAsync: vi.fn(async () => [1]),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

vi.mock('@/src/services/settings-service', () => ({
  getSetting: (key: string) => settings.get(key) ?? null,
  setSetting: (key: string, value: string) => {
    settings.set(key, value);
  },
}));

vi.mock('@/src/services/secure-settings-service', () => ({
  getSensitiveSetting: (key: string) => secure.get(key) ?? null,
  setSensitiveSettingSync: (key: string, value: string) => {
    secure.set(key, value);
  },
  deleteSensitiveSetting: async (key: string) => {
    secure.delete(key);
  },
}));

import * as LocalAuthentication from 'expo-local-authentication';
import {
  disableBiometricLogin,
  enableBiometricLogin,
  isAppLockEnabled,
  isBiometricLoginEnabled,
  unlockBiometricCredentials,
} from './app-lock-service';

describe('app-lock-service biometric login', () => {
  beforeEach(() => {
    settings.clear();
    secure.clear();
    vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ success: true } as never);
  });

  it('enables Face ID login and stores credentials', async () => {
    const ok = await enableBiometricLogin(
      { loginType: 'email', login: 'user@example.com', password: 'secret1' },
      'Enable',
    );
    expect(ok).toBe(true);
    expect(isBiometricLoginEnabled()).toBe(true);
    expect(isAppLockEnabled()).toBe(true);
  });

  it('rejects empty credentials', async () => {
    const ok = await enableBiometricLogin(
      { loginType: 'email', login: '', password: '' },
      'Enable',
    );
    expect(ok).toBe(false);
    expect(isBiometricLoginEnabled()).toBe(false);
  });

  it('unlocks stored credentials after biometric success', async () => {
    await enableBiometricLogin(
      { loginType: 'phone', login: '+79991234567', password: 'secret1' },
      'Enable',
    );
    const creds = await unlockBiometricCredentials('Unlock');
    expect(creds).toEqual({
      loginType: 'phone',
      login: '+79991234567',
      password: 'secret1',
    });
  });

  it('disables biometric login and clears credentials', async () => {
    await enableBiometricLogin(
      { loginType: 'email', login: 'user@example.com', password: 'secret1' },
      'Enable',
    );
    await disableBiometricLogin();
    expect(isBiometricLoginEnabled()).toBe(false);
    expect(isAppLockEnabled()).toBe(false);
    expect(await unlockBiometricCredentials('Unlock')).toBeNull();
  });
});
