import * as Crypto from 'expo-crypto';
import {
  normalizeLogin,
  validateAuthForm,
  type AuthUser,
  type LoginType,
} from '@allerguide/core';
import { getDb } from '@/src/db/init';
import { getSetting, setSetting } from '@/src/services/settings-service';

interface StoredUser extends AuthUser {
  passwordHash: string;
  createdAt: string;
}

const AUTH_USER_ID_KEY = 'authUserId';

async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `allerguide:${password}`,
  );
}

function setSessionUserId(userId: number) {
  setSetting(AUTH_USER_ID_KEY, String(userId));
}

function clearSessionUserId() {
  setSetting(AUTH_USER_ID_KEY, '');
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

  const passwordHash = await hashPassword(input.password);
  if (row.passwordHash !== passwordHash) {
    return { ok: false, error: 'Неверный логин или пароль.' };
  }

  setSessionUserId(row.id);
  return { ok: true, user: toAuthUser(row) };
}

export function logoutUser() {
  clearSessionUserId();
}
