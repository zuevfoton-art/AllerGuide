import { eq } from 'drizzle-orm';
import {
  hashPassword,
  normalizeLogin,
  verifyPassword,
  type AuthUser,
  type LoginType,
} from '@allerguide/core';
import { db } from '../db';
import { appUsers } from '../db/app-schema';

export function toAuthUser(row: typeof appUsers.$inferSelect): AuthUser {
  return {
    id: row.id,
    login: row.login,
    loginType: row.loginType as LoginType,
  };
}

export async function findUserByLogin(login: string) {
  const rows = await db.select().from(appUsers).where(eq(appUsers.login, login)).limit(1);
  return rows[0] ?? null;
}

export async function findUserById(id: number) {
  const rows = await db.select().from(appUsers).where(eq(appUsers.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function registerAppUser(input: {
  loginType: LoginType;
  login: string;
  password: string;
}): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const normalizedLogin = normalizeLogin(input.loginType, input.login);
  const existing = await findUserByLogin(normalizedLogin);

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
  const inserted = await db
    .insert(appUsers)
    .values({
      login: normalizedLogin,
      loginType: input.loginType,
      passwordHash,
    })
    .returning();

  const user = inserted[0];
  if (!user) return { ok: false, error: 'Не удалось создать аккаунт.' };

  return { ok: true, user: toAuthUser(user) };
}

export async function loginAppUser(input: {
  loginType: LoginType;
  login: string;
  password: string;
}): Promise<
  | { ok: true; user: AuthUser }
  | { ok: false; error: string; upgradedHash?: string; userId?: number }
> {
  const normalizedLogin = normalizeLogin(input.loginType, input.login);
  const row = await findUserByLogin(normalizedLogin);

  if (!row) {
    return { ok: false, error: 'Неверный логин или пароль.' };
  }

  const verification = await verifyPassword(input.password, row.passwordHash);
  if (!verification.valid) {
    return { ok: false, error: 'Неверный логин или пароль.' };
  }

  if (verification.upgradedHash) {
    await db
      .update(appUsers)
      .set({ passwordHash: verification.upgradedHash, updatedAt: new Date() })
      .where(eq(appUsers.id, row.id));
  }

  return { ok: true, user: toAuthUser(row) };
}

export async function deleteAppUser(userId: number) {
  await db.delete(appUsers).where(eq(appUsers.id, userId));
}
