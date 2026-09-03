import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  hashPassword,
  normalizeLogin,
  validateLoginField,
  validateLoginPassword,
  validatePassword,
  verifyPassword,
  type AuthUser,
  type LoginType,
} from '@allerguide/core';
import { BACKEND_AUTH_ENABLED } from '@/src/constants/features';
import { getDb } from '@/src/db/init';
import { getSetting, setSetting } from '@/src/services/settings-service';
import { hydrateSensitiveSettings } from '@/src/services/secure-settings-service';
import {
  backendDeleteAccount,
  backendLogin,
  backendRegister,
  backendFetchMe,
  backendLogout,
  cacheAuthUser,
  clearAuthToken,
  clearCachedAuthUser,
  getAuthToken,
  getCachedAuthUser,
  syncProfilesFromBackend,
} from '@/src/services/backend-api';
import {
  applyAuthSession,
  getRefreshToken,
  refreshAccessToken,
  usesCookieAuth,
} from '@/src/services/token-session';
import { trackEvent } from '@/src/services/analytics-service';
import { useAppStore } from '@/src/store/app-store';
import { clearRecoveryKey } from '@/src/services/backup-crypto';
import { yieldToRender } from '@/src/utils/yield-to-render';

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

  await hydrateSensitiveSettings();

  const secureUserId = await SecureStore.getItemAsync(AUTH_USER_ID_KEY);
  if (secureUserId) {
    const localValue = getSetting(AUTH_USER_ID_KEY);
    if (localValue !== secureUserId) {
      setSetting(AUTH_USER_ID_KEY, secureUserId);
    }
  }
}

/**
 * Restore backend JWT session after cold start (P1.2c).
 * Offline-first: cached user + token is enough; /api/auth/me only when cache is incomplete.
 */
export async function restoreAuthSession(): Promise<void> {
  await hydrateAuthSession();

  if (!BACKEND_AUTH_ENABLED) return;

  let token = await getAuthToken();
  if (!token && (getRefreshToken() || usesCookieAuth())) {
    token = await refreshAccessToken();
  }
  if (!token) {
    if (getSessionUserId() || getCachedAuthUser()) {
      logoutUser();
    }
    return;
  }

  if (getCachedAuthUser() && getSessionUserId()) {
    const userId = getSessionUserId()!;
    // Await pull so bootstrap can activate a real local profile immediately.
    await syncProfilesFromBackend(userId, token);
    return;
  }

  const me = await backendFetchMe(token);
  if (!me.ok) {
    logoutUser();
    return;
  }

  cacheAuthUser(me.data.user);
  setSessionUserId(me.data.user.id);
  await syncProfilesFromBackend(me.data.user.id, token);
}

export function isAuthenticated(): boolean {
  if (BACKEND_AUTH_ENABLED) {
    return getSessionUserId() != null && getCachedAuthUser() != null;
  }
  return getSessionUserId() != null && getCurrentUser() != null;
}

export function getCurrentUser(): AuthUser | null {
  if (BACKEND_AUTH_ENABLED) {
    return getCachedAuthUser();
  }

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
  const validationError =
    validateLoginField(input.login) ?? validatePassword(input.password, input.confirmPassword);
  if (validationError) return { ok: false, error: validationError };

  if (BACKEND_AUTH_ENABLED) {
    const response = await backendRegister(input);
    if (!response.ok) return { ok: false, error: response.error };

    applyAuthSession(response.data);

    cacheAuthUser(response.data.user);
    setSessionUserId(response.data.user.id);
    await syncProfilesFromBackend(response.data.user.id, response.data.token);

    trackEvent('auth_register', { method: input.loginType, source: 'backend' });
    return { ok: true, user: response.data.user };
  }

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

  await yieldToRender();
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
  trackEvent('auth_register', { method: input.loginType, source: 'local' });
  return { ok: true, user: toAuthUser(created) };
}

export async function loginUser(input: {
  loginType: LoginType;
  login: string;
  password: string;
}): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const validationError = validateLoginField(input.login) ?? validateLoginPassword(input.password);
  if (validationError) return { ok: false, error: validationError };

  if (BACKEND_AUTH_ENABLED) {
    const response = await backendLogin(input);
    if (!response.ok) return { ok: false, error: response.error };

    applyAuthSession(response.data);
    cacheAuthUser(response.data.user);
    setSessionUserId(response.data.user.id);
    await syncProfilesFromBackend(response.data.user.id, response.data.token);
    trackEvent('auth_login', { method: input.loginType, source: 'backend' });
    return { ok: true, user: response.data.user };
  }

  const normalizedLogin = normalizeLogin(input.loginType, input.login);
  const db = getDb();
  const row = db.getFirstSync<StoredUser>('SELECT * FROM users WHERE login = ?', [normalizedLogin]);

  if (!row) {
    return { ok: false, error: 'Неверный логин или пароль.' };
  }

  await yieldToRender();
  const verification = await verifyPassword(input.password, row.passwordHash);
  if (!verification.valid) {
    return { ok: false, error: 'Неверный логин или пароль.' };
  }

  if (verification.upgradedHash) {
    db.runSync('UPDATE users SET passwordHash = ? WHERE id = ?', [verification.upgradedHash, row.id]);
  }

  setSessionUserId(row.id);
  trackEvent('auth_login', { method: input.loginType, source: 'local' });
  return { ok: true, user: toAuthUser(row) };
}

export function logoutUser() {
  trackEvent('auth_logout');
  const refreshToken = getRefreshToken();
  void (async () => {
    const token = await getAuthToken();
    if (token || refreshToken) {
      await backendLogout({ token, refreshToken });
    }
    await clearAuthToken();
  })();
  clearSessionUserId();
  clearCachedAuthUser();
  useAppStore.getState().resetAppState();
}

export async function deleteAccount(): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = getSessionUserId();
  if (!userId) return { ok: false, error: 'Пользователь не авторизован.' };

  if (BACKEND_AUTH_ENABLED) {
    const token = await getAuthToken();
    if (!token) return { ok: false, error: 'Сессия истекла. Войдите снова.' };

    const response = await backendDeleteAccount(token);
    if (!response.ok) return { ok: false, error: response.error };
  }

  const db = getDb();
  const profiles = db.getAllSync<{ id: number }>('SELECT id FROM profiles WHERE userId = ?', [userId]);

  for (const profile of profiles) {
    db.runSync('DELETE FROM diary_entries WHERE profileId = ?', [profile.id]);
    db.runSync('DELETE FROM scan_history WHERE profileId = ?', [profile.id]);
    db.runSync('DELETE FROM emergency_contacts WHERE profileId = ?', [profile.id]);
    db.runSync('DELETE FROM profile_sos WHERE profileId = ?', [profile.id]);
    db.runSync('DELETE FROM safe_products WHERE profileId = ?', [profile.id]);
    db.runSync('DELETE FROM profiles WHERE id = ?', [profile.id]);
  }

  db.runSync('DELETE FROM alias_feedback');
  db.runSync('DELETE FROM users WHERE id = ?', [userId]);

  clearRecoveryKey();
  clearSessionUserId();
  clearCachedAuthUser();
  void clearAuthToken();
  useAppStore.getState().resetAppState();
  return { ok: true };
}

export async function getBackendAuthToken(): Promise<string | null> {
  if (!BACKEND_AUTH_ENABLED) return null;
  return getAuthToken();
}
