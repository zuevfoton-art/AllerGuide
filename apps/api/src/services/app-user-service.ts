import { randomUUID } from 'crypto';
import { randomBytes } from 'crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import {
  hashPassword,
  normalizeLogin,
  verifyPassword,
  type AuthUser,
  type LoginType,
} from '@allerguide/core';
import { db } from '../db';
import { appUsers, passwordResetTokens, syncBackups } from '../db/app-schema';

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
      email: input.loginType === 'email' ? normalizedLogin : null,
      phone: input.loginType === 'phone' ? normalizedLogin : null,
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
  await db.delete(syncBackups).where(eq(syncBackups.userId, userId));
  await db.delete(appUsers).where(eq(appUsers.id, userId));
}

export async function createPasswordResetToken(userId: number): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
  return token;
}

export async function findValidResetToken(token: string) {
  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        gt(passwordResetTokens.expiresAt, new Date()),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function consumeResetToken(token: string, newPassword: string): Promise<boolean> {
  const row = await findValidResetToken(token);
  if (!row) return false;

  const passwordHash = await hashPassword(newPassword);
  await db
    .update(appUsers)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(appUsers.id, row.userId));

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, row.id));

  return true;
}

export async function findOrCreateReplitUser(claims: {
  sub: string;
}): Promise<(typeof appUsers.$inferSelect) | null> {
  const login = `replit_${claims.sub}`;

  const existing = await findUserByLogin(login);
  if (existing) return existing;

  const passwordHash = await hashPassword(randomUUID());
  const [created] = await db
    .insert(appUsers)
    .values({ login, loginType: 'replit', passwordHash })
    .returning();

  return created ?? null;
}
