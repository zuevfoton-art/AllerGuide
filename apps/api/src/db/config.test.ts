import { describe, expect, it } from 'vitest';
import {
  buildConnectionOptions,
  deriveDirectDatabaseUrl,
  isHeliumDatabaseUrl,
  resolveMigrationUrl,
  resolveReadUrl,
  resolveRuntimeUrl,
} from './config';

describe('db connection config', () => {
  it('returns empty options by default (postgres-js honors sslmode in URL)', () => {
    expect(buildConnectionOptions({})).toEqual({});
  });

  it('maps DB_SSL to the ssl option', () => {
    expect(buildConnectionOptions({ DB_SSL: 'require' }).ssl).toBe('require');
    expect(buildConnectionOptions({ DB_SSL: 'disable' }).ssl).toBe(false);
  });

  it('disables prepared statements for pooled (PgBouncer) connections', () => {
    expect(buildConnectionOptions({ DB_PREPARE: 'false' }).prepare).toBe(false);
    expect(buildConnectionOptions({}).prepare).toBeUndefined();
  });

  it('parses pool sizing and timeouts, ignoring invalid values', () => {
    const opts = buildConnectionOptions({
      DB_POOL_MAX: '5',
      DB_IDLE_TIMEOUT: '30',
      DB_CONNECT_TIMEOUT: '10',
      DB_MAX_LIFETIME: '600',
    });
    expect(opts).toMatchObject({ max: 5, idle_timeout: 30, connect_timeout: 10, max_lifetime: 600 });

    expect(buildConnectionOptions({ DB_POOL_MAX: '0' }).max).toBeUndefined();
    expect(buildConnectionOptions({ DB_POOL_MAX: 'abc' }).max).toBeUndefined();
  });

  it('resolves runtime / migration / read URLs with correct precedence', () => {
    const env = {
      DATABASE_URL: 'postgres://pooled',
      DIRECT_DATABASE_URL: 'postgres://direct',
      READ_DATABASE_URL: 'postgres://replica',
    };
    expect(resolveRuntimeUrl(env)).toBe('postgres://pooled');
    expect(resolveMigrationUrl(env)).toBe('postgres://direct');
    expect(resolveReadUrl(env)).toBe('postgres://replica');
  });

  it('falls back migration URL to DATABASE_URL and read URL to null', () => {
    expect(resolveMigrationUrl({ DATABASE_URL: 'postgres://only' })).toBe('postgres://only');
    expect(resolveReadUrl({ DATABASE_URL: 'postgres://only' })).toBeNull();
  });

  it('derives direct migration URL from Neon pooled DATABASE_URL', () => {
    const pooled =
      'postgres://user:pass@ep-abc-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';
    const direct =
      'postgres://user:pass@ep-abc.us-east-2.aws.neon.tech/neondb?sslmode=require';
    expect(deriveDirectDatabaseUrl(pooled)).toBe(direct);
    expect(resolveMigrationUrl({ DATABASE_URL: pooled })).toBe(direct);
  });

  it('honors sslmode=disable in Helium URL without DB_SSL env', () => {
    const helium =
      'postgresql://postgres:password@helium/heliumdb?sslmode=disable';
    expect(isHeliumDatabaseUrl(helium)).toBe(true);
    expect(buildConnectionOptions({ DATABASE_URL: helium }).ssl).toBe(false);
  });

  it('honors sslmode=require in URL when DB_SSL unset', () => {
    const url = 'postgres://user@host/db?sslmode=require';
    expect(buildConnectionOptions({ DATABASE_URL: url }).ssl).toBe('require');
  });
});
