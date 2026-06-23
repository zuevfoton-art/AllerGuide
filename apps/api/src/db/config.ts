/**
 * Database connection configuration, kept pure/testable and Neon-aware.
 *
 * Neon notes:
 *  - Use the POOLED connection string (PgBouncer, host `...-pooler...`) for the
 *    app runtime, with `DB_PREPARE=false` (transaction pooling is incompatible
 *    with prepared statements) and `DB_SSL=require`.
 *  - Use the DIRECT (unpooled) string for migrations (`DIRECT_DATABASE_URL`).
 *  - Optionally point read-only catalog queries at a read replica
 *    (`READ_DATABASE_URL`).
 */
type Env = Record<string, string | undefined>;

export interface PgConnectionOptions {
  ssl?: 'require' | false;
  prepare?: boolean;
  max?: number;
  idle_timeout?: number;
  connect_timeout?: number;
  max_lifetime?: number;
}

function positiveNumber(value: string | undefined): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/** Build postgres-js connection options from environment variables. */
export function buildConnectionOptions(env: Env = process.env): PgConnectionOptions {
  const options: PgConnectionOptions = {};

  // TLS: Neon requires it. `require` for managed, `disable` for plain local PG.
  // When unset, postgres-js honors `sslmode` in the connection string.
  if (env.DB_SSL === 'require') options.ssl = 'require';
  else if (env.DB_SSL === 'disable') options.ssl = false;

  // Disable prepared statements for PgBouncer transaction pooling (Neon pooled).
  if (env.DB_PREPARE === 'false') options.prepare = false;

  const max = positiveNumber(env.DB_POOL_MAX);
  if (max !== undefined) options.max = max;

  const idle = positiveNumber(env.DB_IDLE_TIMEOUT);
  if (idle !== undefined) options.idle_timeout = idle;

  const connect = positiveNumber(env.DB_CONNECT_TIMEOUT);
  if (connect !== undefined) options.connect_timeout = connect;

  const lifetime = positiveNumber(env.DB_MAX_LIFETIME);
  if (lifetime !== undefined) options.max_lifetime = lifetime;

  return options;
}

/** Runtime (app) connection string — the pooled endpoint on Neon. */
export function resolveRuntimeUrl(env: Env = process.env): string | undefined {
  return env.DATABASE_URL;
}

/** Migration connection string — the direct (unpooled) endpoint on Neon. */
export function resolveMigrationUrl(env: Env = process.env): string | undefined {
  return env.DIRECT_DATABASE_URL ?? env.DATABASE_URL;
}

/** Optional read-replica connection string; null when not configured. */
export function resolveReadUrl(env: Env = process.env): string | null {
  return env.READ_DATABASE_URL ?? null;
}
