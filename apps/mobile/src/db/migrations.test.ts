import { describe, expect, it, vi } from 'vitest';
import type { DbLike } from './types';
import { CURRENT_SCHEMA_VERSION, runMigrations } from './migrations';

describe('runMigrations', () => {
  it('exposes schema version 9 with crossReactionAllergies migration', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(9);
  });

  it('creates safe_products when upgrading from schema version 6', () => {
    const executed: string[] = [];
    const runSync = vi.fn();

    const db: DbLike = {
      execSync: (sql) => {
        executed.push(sql);
      },
      runSync,
      getFirstSync: <T>() => ({ version: 6 }) as T,
      getAllSync: () => [],
    };

    runMigrations(db);

    expect(executed.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS safe_products'))).toBe(true);
    expect(executed.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS diary_attachments'))).toBe(true);
    expect(runSync).toHaveBeenLastCalledWith('UPDATE schema_version SET version = ?', [9]);
  });

  it('creates diary_attachments when upgrading from schema version 7', () => {
    const executed: string[] = [];
    const runSync = vi.fn();

    const db: DbLike = {
      execSync: (sql) => {
        executed.push(sql);
      },
      runSync,
      getFirstSync: <T>() => ({ version: 7 }) as T,
      getAllSync: () => [],
    };

    runMigrations(db);

    expect(executed.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS diary_attachments'))).toBe(true);
    expect(runSync).toHaveBeenCalledWith('UPDATE schema_version SET version = ?', [8]);
    expect(runSync).toHaveBeenLastCalledWith('UPDATE schema_version SET version = ?', [9]);
  });

  it('adds crossReactionAllergies column when upgrading from schema version 8', () => {
    const executed: string[] = [];
    const runSync = vi.fn();

    const db: DbLike = {
      execSync: (sql) => {
        executed.push(sql);
      },
      runSync,
      getFirstSync: <T>() => ({ version: 8 }) as T,
      getAllSync: () => [],
    };

    runMigrations(db);

    expect(
      executed.some((sql) => sql.includes('crossReactionAllergies')),
    ).toBe(true);
    expect(runSync).toHaveBeenLastCalledWith('UPDATE schema_version SET version = ?', [9]);
  });
});
