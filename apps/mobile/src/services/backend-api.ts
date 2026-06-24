import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { AuthUser, Profile, ProfileInput } from '@allerguide/core';
import { apiRequest } from '@/src/services/api-client';
import { getDb } from '@/src/db/init';
import { getSetting, setSetting } from '@/src/services/settings-service';

const AUTH_TOKEN_KEY = 'authToken';
const AUTH_USER_JSON_KEY = 'authUserJson';

export async function getAuthToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return getSetting(AUTH_TOKEN_KEY);
  }
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function setAuthToken(token: string) {
  setSetting(AUTH_TOKEN_KEY, token);
  if (Platform.OS !== 'web') {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  }
}

export async function clearAuthToken() {
  setSetting(AUTH_TOKEN_KEY, '');
  if (Platform.OS !== 'web') {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  }
}

export function cacheAuthUser(user: AuthUser) {
  setSetting('authUserId', String(user.id));
  setSetting(AUTH_USER_JSON_KEY, JSON.stringify(user));
}

export function getCachedAuthUser(): AuthUser | null {
  const raw = getSetting(AUTH_USER_JSON_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearCachedAuthUser() {
  setSetting('authUserId', '');
  setSetting(AUTH_USER_JSON_KEY, '');
}

export async function backendRegister(input: {
  loginType: 'email' | 'phone';
  login: string;
  password: string;
  confirmPassword: string;
}) {
  return apiRequest<{ user: AuthUser; token: string }>('/api/auth/register', {
    method: 'POST',
    body: input,
  });
}

export async function backendLogin(input: {
  loginType: 'email' | 'phone';
  login: string;
  password: string;
}) {
  return apiRequest<{ user: AuthUser; token: string }>('/api/auth/login', {
    method: 'POST',
    body: input,
  });
}

export async function backendFetchMe(token: string) {
  return apiRequest<{ user: AuthUser }>('/api/auth/me', { token });
}

export async function backendDeleteAccount(token: string) {
  return apiRequest<{ ok: true }>('/api/auth/account', { method: 'DELETE', token });
}

export async function backendForgotPassword(input: { login: string; loginType: 'email' | 'phone' }) {
  return apiRequest<{ ok: true; resetToken?: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: input,
  });
}

export async function backendResetPassword(input: { token: string; password: string; confirmPassword: string }) {
  return apiRequest<{ ok: true }>('/api/auth/reset-password', {
    method: 'POST',
    body: input,
  });
}

export async function backendReplitExchange() {
  return apiRequest<{ user: AuthUser; token: string }>('/api/auth/replit-exchange', {});
}

export async function backendListProfiles(token: string) {
  return apiRequest<{ profiles: Profile[] }>('/api/profiles', { token });
}

export async function backendCreateProfile(token: string, input: ProfileInput) {
  return apiRequest<{ profile: Profile }>('/api/profiles', {
    method: 'POST',
    token,
    body: input,
  });
}

export async function backendUpdateProfile(token: string, id: number, input: ProfileInput) {
  return apiRequest<{ profile: Profile }>(`/api/profiles/${id}`, {
    method: 'PATCH',
    token,
    body: input,
  });
}

export async function backendDeleteProfile(token: string, id: number) {
  return apiRequest<{ ok: true }>(`/api/profiles/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function upsertLocalProfile(profile: Profile) {
  const db = getDb();
  db.runSync(
    'INSERT OR REPLACE INTO profiles (id, userId, name, birthYear, type, allergies) VALUES (?, ?, ?, ?, ?, ?)',
    [
      profile.id,
      profile.userId ?? 0,
      profile.name,
      profile.birthYear,
      profile.type,
      profile.allergies,
    ],
  );
}

export function replaceLocalProfilesForUser(userId: number, items: Profile[]) {
  const db = getDb();
  const existing = db.getAllSync<{ id: number }>('SELECT id FROM profiles WHERE userId = ?', [userId]);
  for (const row of existing) {
    db.runSync('DELETE FROM profiles WHERE id = ?', [row.id]);
  }
  for (const profile of items) {
    upsertLocalProfile({ ...profile, userId });
  }
}

export async function syncProfilesFromBackend(userId: number, token: string) {
  const response = await backendListProfiles(token);
  if (!response.ok) return response;
  replaceLocalProfilesForUser(userId, response.data.profiles);
  return { ok: true as const };
}
