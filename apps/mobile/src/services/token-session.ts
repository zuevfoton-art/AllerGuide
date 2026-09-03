import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getSetting, setSetting } from '@/src/services/settings-service';
import {
  deleteSensitiveSetting,
  getSensitiveSetting,
  setSensitiveSettingSync,
} from '@/src/services/secure-settings-service';

const ACCESS_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

let webAccessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export async function getAccessToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (webAccessToken) return webAccessToken;
    const legacy = getSetting(ACCESS_TOKEN_KEY);
    if (legacy) {
      webAccessToken = legacy;
      setSetting(ACCESS_TOKEN_KEY, '');
      return legacy;
    }
    return null;
  }

  const cached = getSensitiveSetting(ACCESS_TOKEN_KEY);
  if (cached) return cached;
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  if (Platform.OS === 'web') {
    webAccessToken = token;
    setSetting(ACCESS_TOKEN_KEY, '');
    return;
  }
  setSensitiveSettingSync(ACCESS_TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  if (Platform.OS === 'web') {
    return getSetting(REFRESH_TOKEN_KEY);
  }
  return getSensitiveSetting(REFRESH_TOKEN_KEY) ?? getSetting(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  if (Platform.OS === 'web') {
    setSetting(REFRESH_TOKEN_KEY, token);
    return;
  }
  setSensitiveSettingSync(REFRESH_TOKEN_KEY, token);
}

export async function clearAuthSessionTokens(): Promise<void> {
  webAccessToken = null;
  await deleteSensitiveSetting(ACCESS_TOKEN_KEY);
  await deleteSensitiveSetting(REFRESH_TOKEN_KEY);
  setSetting(ACCESS_TOKEN_KEY, '');
  setSetting(REFRESH_TOKEN_KEY, '');
}

export function applyAuthSession(session: { token: string; refreshToken?: string }): void {
  setAccessToken(session.token);
  if (session.refreshToken) setRefreshToken(session.refreshToken);
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken();
    const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
    if (!refreshToken || !baseUrl) return null;

    try {
      const response = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        token?: string;
        refreshToken?: string;
      };
      if (!response.ok || !payload.ok || !payload.token) {
        return null;
      }
      applyAuthSession({ token: payload.token, refreshToken: payload.refreshToken });
      return payload.token;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/** @internal test helper */
export function __resetWebAccessTokenForTests(): void {
  webAccessToken = null;
  refreshInFlight = null;
}
