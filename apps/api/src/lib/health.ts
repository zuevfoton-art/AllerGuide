import postgres from 'postgres';
import { buildConnectionOptions, resolveRuntimeUrl } from '../db/config';

export interface HealthCheckResult {
  ok: boolean;
  authDatabase: boolean;
  database?: {
    ok: boolean;
    latencyMs?: number;
    error?: string;
  };
}

/**
 * Lightweight DB ping for staging/production health checks.
 * Opens a short-lived connection; does not use the shared pool singleton.
 */
export async function checkDatabaseConnectivity(): Promise<{
  ok: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const url = resolveRuntimeUrl();
  if (!url) {
    return { ok: false, error: 'DATABASE_URL is not configured' };
  }

  const started = Date.now();
  const client = postgres(url, { ...buildConnectionOptions(), max: 1 });

  try {
    await client`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - started };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database ping failed';
    return { ok: false, error: message, latencyMs: Date.now() - started };
  } finally {
    await client.end({ timeout: 2 });
  }
}

export async function buildHealthPayload(): Promise<HealthCheckResult> {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const authDatabase = hasDatabaseUrl && Boolean(process.env.JWT_SECRET);

  if (!hasDatabaseUrl) {
    return { ok: true, authDatabase: false };
  }

  const database = await checkDatabaseConnectivity();
  const ok = database.ok && Boolean(process.env.JWT_SECRET);
  return {
    ok,
    authDatabase,
    database,
  };
}
