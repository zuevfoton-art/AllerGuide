import postgres from 'postgres';
import { closeDb } from '../db';
import { buildConnectionOptions, resolveRuntimeUrl } from '../db/config';

/** True when DATABASE_URL points at a real Postgres (CI service or local). */
export const hasIntegrationDatabase = Boolean(process.env.DATABASE_URL);

export function applyIntegrationDefaults(): void {
  process.env.JWT_SECRET ??= 'ci-integration-test-jwt-secret-32chars';
  process.env.SYNC_ENABLED ??= 'true';
  process.env.AI_SCAN_ENABLED ??= 'true';
  process.env.SCAN_REQUIRE_AUTH ??= 'true';
  process.env.RATE_LIMIT_DISABLED ??= 'true';
  process.env.OPENAI_API_KEY ??= 'test-openai-key';
  delete process.env.SYNC_API_KEY;
}

/** Wipe user-scoped tables between integration tests. */
export async function resetProfileData(): Promise<void> {
  const url = resolveRuntimeUrl();
  if (!url) return;

  closeDb();

  const client = postgres(url, { ...buildConnectionOptions(), max: 1 });
  try {
    await client`
      TRUNCATE TABLE
        profile.sync_backups,
        profile.profiles,
        profile.app_users
      RESTART IDENTITY CASCADE
    `;
  } finally {
    await client.end({ timeout: 2 });
  }

  closeDb();
}

export function uniqueLogin(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}
