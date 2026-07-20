import { Alert, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import type { LoginType } from '@allerguide/core';
import { getSetting, setSetting } from '@/src/services/settings-service';
import {
  deleteSensitiveSetting,
  getSensitiveSetting,
  setSensitiveSettingSync,
} from '@/src/services/secure-settings-service';

const APP_LOCK_KEY = 'appLockEnabled';
const BIOMETRIC_LOGIN_FLAG = 'biometricLoginEnabled';
export const BIOMETRIC_CREDENTIALS_KEY = 'biometricLoginPayload';

export type BiometricCredentials = {
  loginType: LoginType;
  login: string;
  password: string;
};

export type BiometricKind = 'face' | 'fingerprint' | 'iris' | 'none';

export function isAppLockEnabled(): boolean {
  return getSetting(APP_LOCK_KEY) === 'true';
}

export function setAppLockEnabled(enabled: boolean): void {
  setSetting(APP_LOCK_KEY, enabled ? 'true' : 'false');
}

export function isBiometricLoginEnabled(): boolean {
  return getSetting(BIOMETRIC_LOGIN_FLAG) === 'true' && Boolean(readStoredCredentials());
}

function setBiometricLoginFlag(enabled: boolean): void {
  setSetting(BIOMETRIC_LOGIN_FLAG, enabled ? 'true' : 'false');
}

function readStoredCredentials(): BiometricCredentials | null {
  const raw = getSensitiveSetting(BIOMETRIC_CREDENTIALS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BiometricCredentials;
    if (!parsed?.loginType || !parsed?.login || !parsed?.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function canUseBiometricLock(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
}

export async function getBiometricKind(): Promise<BiometricKind> {
  if (Platform.OS === 'web') return 'none';
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'iris';
  return 'none';
}

export async function authenticateBiometric(reason: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function requireAppUnlock(reason: string): Promise<boolean> {
  if (!isAppLockEnabled()) return true;
  if (Platform.OS === 'web') return true;
  return authenticateBiometric(reason);
}

/** Enable Face ID / biometrics for later logins: verify once, then store credentials securely. */
export async function enableBiometricLogin(
  credentials: BiometricCredentials,
  reason: string,
): Promise<boolean> {
  if (!(await canUseBiometricLock())) return false;
  if (!credentials.login?.trim() || !credentials.password) return false;
  const ok = await authenticateBiometric(reason);
  if (!ok) return false;

  setSensitiveSettingSync(BIOMETRIC_CREDENTIALS_KEY, JSON.stringify(credentials));
  setBiometricLoginFlag(true);
  setAppLockEnabled(true);
  return true;
}

export async function disableBiometricLogin(): Promise<void> {
  setBiometricLoginFlag(false);
  setAppLockEnabled(false);
  await deleteSensitiveSetting(BIOMETRIC_CREDENTIALS_KEY);
}

/** After Face ID success, return stored credentials for password login. */
export async function unlockBiometricCredentials(reason: string): Promise<BiometricCredentials | null> {
  if (!isBiometricLoginEnabled()) return null;
  if (!(await canUseBiometricLock())) return null;
  const ok = await authenticateBiometric(reason);
  if (!ok) return null;
  return readStoredCredentials();
}

export type BiometricPromptCopy = {
  title: string;
  message: string;
  enable: string;
  skip: string;
  reason: string;
};

/** Offer Face ID after successful register/login. Resolves when the user chooses. */
export function promptEnableBiometricLogin(
  credentials: BiometricCredentials,
  copy: BiometricPromptCopy,
): Promise<boolean> {
  return new Promise((resolve) => {
    void (async () => {
      if (Platform.OS === 'web' || !(await canUseBiometricLock())) {
        resolve(false);
        return;
      }
      if (isBiometricLoginEnabled()) {
        // Refresh stored credentials after a fresh password login.
        setSensitiveSettingSync(BIOMETRIC_CREDENTIALS_KEY, JSON.stringify(credentials));
        setAppLockEnabled(true);
        resolve(true);
        return;
      }

      Alert.alert(copy.title, copy.message, [
        {
          text: copy.skip,
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: copy.enable,
          onPress: () => {
            void enableBiometricLogin(credentials, copy.reason).then(resolve);
          },
        },
      ]);
    })();
  });
}
