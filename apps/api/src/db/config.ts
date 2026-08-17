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

function sslModeFromUrl(url: string | undefined): 'require' | 'disable' | undefined {
  if (!url) return undefined;
  if (/[?&]sslmode=disable(?:&|$)/.test(url)) return 'disable';
  if (/[?&]sslmode=require(?:&|$)/.test(url)) return 'require';
  return undefined;
}

/** True for an internal Helium Postgres host (`@helium/` in the URL). */
export function isHeliumDatabaseUrl(url: string): boolean {
  return /@helium(?:\/|$)/.test(url) || url.includes('heliumdb');
}

/** Build postgres-js connection options from environment variables. */
export function buildConnectionOptions(env: Env = process.env): PgConnectionOptions {
  const options: PgConnectionOptions = {};

  // TLS: explicit env wins; else honor sslmode= in the connection string (Helium uses disable).
  if (env.DB_SSL === 'require') options.ssl = 'require';
  else if (env.DB_SSL === 'disable') options.ssl = false;
  else {
    const fromUrl = sslModeFromUrl(env.DATABASE_URL ?? env.DIRECT_DATABASE_URL);
    if (fromUrl === 'require') options.ssl = 'require';
    else if (fromUrl === 'disable') options.ssl = false;
  }

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

/** Strip Neon PgBouncer `-pooler` host suffix for direct (migration) connections. */
export function deriveDirectDatabaseUrl(url: string): string {
  return url.includes('-pooler') ? url.replace('-pooler', '') : url;
}

/** True when DATABASE_URL points at a Neon PgBouncer pooler host. */
export function isNeonPoolerUrl(url: string | undefined): boolean {
  return Boolean(url?.includes('-pooler'));
}

/** Runtime (app) connection string — the pooled endpoint on Neon. */
export function resolveRuntimeUrl(env: Env = process.env): string | undefined {
  return env.DATABASE_URL;
}

/** Migration connection string — the direct (unpooled) endpoint on Neon. */
export function resolveMigrationUrl(env: Env = process.env): string | undefined {
  if (env.DIRECT_DATABASE_URL) return env.DIRECT_DATABASE_URL;
  const runtime = env.DATABASE_URL;
  if (!runtime) return undefined;
  return deriveDirectDatabaseUrl(runtime);
}

/** Optional read-replica connection string; null when not configured. */
export function resolveReadUrl(env: Env = process.env): string | null {
  return env.READ_DATABASE_URL ?? null;
}
