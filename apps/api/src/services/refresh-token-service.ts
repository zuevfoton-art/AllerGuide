import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../db';
import { refreshTokens } from '../db/app-schema';

const DEFAULT_REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TOKEN_BYTES = 32;

type MemoryRefresh = {
  userId: number;
  expiresAt: Date;
  revokedAt: Date | null;
};

const memoryTokens = new Map<string, MemoryRefresh>();

function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function refreshTtlMs(): number {
  const parsed = Number(process.env.REFRESH_TOKEN_TTL_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REFRESH_TTL_MS;
}

export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function newRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex');
}

export async function issueRefreshToken(userId: number): Promise<string> {
  const raw = newRawToken();
  const tokenHash = hashRefreshToken(raw);
  const expiresAt = new Date(Date.now() + refreshTtlMs());

  if (!databaseConfigured()) {
    memoryTokens.set(tokenHash, { userId, expiresAt, revokedAt: null });
    return raw;
  }

  await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt });
  return raw;
}

export async function rotateRefreshToken(
  raw: string,
): Promise<{ userId: number } | null> {
  const tokenHash = hashRefreshToken(raw);
  const now = new Date();

  if (!databaseConfigured()) {
    return claimMemoryRefresh(tokenHash, now);
  }

  // Claim the unused token in one statement so concurrent refreshes cannot
  // both succeed (SELECT then UPDATE by id is not atomic).
  const [claimed] = await db
    .update(refreshTokens)
    .set({ revokedAt: now })
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, now),
      ),
    )
    .returning({ userId: refreshTokens.userId });

  if (claimed) {
    return { userId: claimed.userId };
  }

  const [existing] = await db
    .select({ userId: refreshTokens.userId, revokedAt: refreshTokens.revokedAt })
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (existing?.revokedAt) {
    await revokeRefreshTokensForUser(existing.userId);
  }
  return null;
}

function claimMemoryRefresh(tokenHash: string, now: Date): { userId: number } | null {
  const stored = memoryTokens.get(tokenHash);
  if (!stored) return null;
  if (stored.expiresAt <= now) return null;
  if (stored.revokedAt) {
    revokeMemoryTokensForUser(stored.userId, now);
    return null;
  }
  stored.revokedAt = now;
  return { userId: stored.userId };
}

function revokeMemoryTokensForUser(userId: number, now: Date): void {
  for (const row of memoryTokens.values()) {
    if (row.userId === userId) {
      row.revokedAt = now;
    }
  }
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  const tokenHash = hashRefreshToken(raw);
  const now = new Date();

  if (!databaseConfigured()) {
    const stored = memoryTokens.get(tokenHash);
    if (stored) stored.revokedAt = now;
    return;
  }

  await db
    .update(refreshTokens)
    .set({ revokedAt: now })
    .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)));
}

export async function revokeRefreshTokensForUser(userId: number): Promise<void> {
  const now = new Date();

  if (!databaseConfigured()) {
    revokeMemoryTokensForUser(userId, now);
    return;
  }

  await db
    .update(refreshTokens)
    .set({ revokedAt: now })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt), gt(refreshTokens.expiresAt, now)));
}

/** @internal test helper */
export function __resetRefreshTokenMemoryForTests(): void {
  memoryTokens.clear();
}
