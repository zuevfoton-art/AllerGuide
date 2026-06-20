import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  hashPassword,
  normalizeLogin,
  validateAuthForm,
  verifyPassword,
  type AuthUser,
  type LoginType,
} from '@allerguide/core';
import { getDb } from '@/src/db/init';
import { getSetting, setSetting } from '@/src/services/settings-service';
import { useAppStore } from '@/src/store/app-store';

interface StoredUser extends AuthUser {
  passwordHash: string;
  createdAt: string;
}

const AUTH_USER_ID_KEY = 'authUserId';

function setSessionUserId(userId: number) {
  setSetting(AUTH_USER_ID_KEY, String(userId));
  if (Platform.OS !== 'web') {
    void SecureStore.setItemAsync(AUTH_USER_ID_KEY, String(userId));
  }
}

function clearSessionUserId() {
  setSetting(AUTH_USER_ID_KEY, '');
  if (Platform.OS !== 'web') {
    void SecureStore.deleteItemAsync(AUTH_USER_ID_KEY);
  }
}

function getSessionUserId(): number | null {
  const value = getSetting(AUTH_USER_ID_KEY);
  if (!value) return null;
  const id = Number(value);
  return Number.isNaN(id) ? null : id;
}

function toAuthUser(row: StoredUser): AuthUser {
  return {
    id: row.id,
    login: row.login,
    loginType: row.loginType,
  };
}

export async function hydrateAuthSession(): Promise<void> {
  if (Platform.OS === 'web') return;

  const secureValue = await SecureStore.getItemAsync(AUTH_USER_ID_KEY);
  if (!secureValue) return;

  const localValue = getSetting(AUTH_USER_ID_KEY);
  if (localValue !== secureValue) {
    setSetting(AUTH_USER_ID_KEY, secureValue);
  }
}

export function isAuthenticated(): boolean {
  return getSessionUserId() != null && getCurrentUser() != null;
}

export function getCurrentUser(): AuthUser | null {
  const userId = getSessionUserId();
  if (!userId) return null;

  const db = getDb();
  const row = db.getFirstSync<StoredUser>('SELECT * FROM users WHERE id = ?', [userId]);
  return row ? toAuthUser(row) : null;
}

export function getCurrentUserId(): number | null {
  return getSessionUserId();
}

export async function registerUser(input: {
  loginType: LoginType;
  login: string;
  password: string;
  confirmPassword: string;
}): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const validationError = validateAuthForm(input);
  if (validationError) return { ok: false, error: validationError };

  const normalizedLogin = normalizeLogin(input.loginType, input.login);
  const db = getDb();
  const existing = db.getFirstSync<{ id: number }>('SELECT id FROM users WHERE login = ?', [normalizedLogin]);

  if (existing) {
    return {
      ok: false,
      error:
        input.loginType === 'email'
          ? 'Пользователь с таким email уже зарегистрирован.'
          : 'Пользователь с таким номером уже зарегистрирован.',
    };
  }

  const passwordHash = await hashPassword(input.password);
  db.runSync('INSERT INTO users (login, loginType, passwordHash, createdAt) VALUES (?, ?, ?, ?)', [
    normalizedLogin,
    input.loginType,
    passwordHash,
    new Date().toISOString(),
  ]);

  const created = db.getFirstSync<StoredUser>('SELECT * FROM users WHERE login = ?', [normalizedLogin]);
  if (!created) return { ok: false, error: 'Не удалось создать аккаунт.' };

  setSessionUserId(created.id);
  return { ok: true, user: toAuthUser(created) };
}

export async function loginUser(input: {
  loginType: LoginType;
  login: string;
  password: string;
}): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const validationError = validateAuthForm(input);
  if (validationError) return { ok: false, error: validationError };

  const normalizedLogin = normalizeLogin(input.loginType, input.login);
  const db = getDb();
  const row = db.getFirstSync<StoredUser>('SELECT * FROM users WHERE login = ?', [normalizedLogin]);

  if (!row) {
    return { ok: false, error: 'Неверный логин или пароль.' };
  }

  const verification = await verifyPassword(input.password, row.passwordHash);
  if (!verification.valid) {
    return { ok: false, error: 'Неверный логин или пароль.' };
  }

  if (verification.upgradedHash) {
    db.runSync('UPDATE users SET passwordHash = ? WHERE id = ?', [verification.upgradedHash, row.id]);
  }

  setSessionUserId(row.id);
  return { ok: true, user: toAuthUser(row) };
}

export function logoutUser() {
  clearSessionUserId();
  useAppStore.getState().resetAppState();
}

export async function deleteAccount(): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = getSessionUserId();
  if (!userId) return { ok: false, error: 'Пользователь не авторизован.' };

  const db = getDb();
  const profiles = db.getAllSync<{ id: number }>('SELECT id FROM profiles WHERE userId = ?', [userId]);

  for (const profile of profiles) {
    db.runSync('DELETE FROM diary_entries WHERE profileId = ?', [profile.id]);
    db.runSync('DELETE FROM scan_history WHERE profileId = ?', [profile.id]);
    db.runSync('DELETE FROM emergency_contacts WHERE profileId = ?', [profile.id]);
    db.runSync('DELETE FROM profile_sos WHERE profileId = ?', [profile.id]);
    db.runSync('DELETE FROM profiles WHERE id = ?', [profile.id]);
  }

  db.runSync('DELETE FROM users WHERE id = ?', [userId]);
  clearSessionUserId();
  useAppStore.getState().resetAppState();
  return { ok: true };
}
