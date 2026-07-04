import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { getSetting, setSetting } from '@/src/services/settings-service';

const APP_LOCK_KEY = 'appLockEnabled';

export function isAppLockEnabled(): boolean {
  return getSetting(APP_LOCK_KEY) === 'true';
}

export function setAppLockEnabled(enabled: boolean): void {
  setSetting(APP_LOCK_KEY, enabled ? 'true' : 'false');
}

export async function canUseBiometricLock(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
}

export async function requireAppUnlock(reason: string): Promise<boolean> {
  if (!isAppLockEnabled()) return true;
  if (Platform.OS === 'web') return true;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });

  return result.success;
}
