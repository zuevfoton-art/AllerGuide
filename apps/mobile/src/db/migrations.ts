import type { DbLike } from './types';

export const CURRENT_SCHEMA_VERSION = 2;

const MIGRATIONS: Record<number, (db: DbLike) => void> = {
  1: (db) => {
    db.execSync('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)');
    const row = db.getFirstSync<{ version: number }>('SELECT version FROM schema_version LIMIT 1');
    if (!row) {
      db.runSync('INSERT INTO schema_version (version) VALUES (?)', [0]);
    }
  },
  2: (db) => {
    const columns = db.getAllSync<{ name: string }>('PRAGMA table_info(profiles)');
    if (!columns.some((column) => column.name === 'userId')) {
      db.execSync('ALTER TABLE profiles ADD COLUMN userId INTEGER');
    }
  },
};

export function runMigrations(db: DbLike) {
  MIGRATIONS[1]?.(db);

  const row = db.getFirstSync<{ version: number }>('SELECT version FROM schema_version LIMIT 1');
  let version = row?.version ?? 0;

  while (MIGRATIONS[version + 1]) {
    MIGRATIONS[version + 1](db);
    version += 1;
    db.runSync('UPDATE schema_version SET version = ?', [version]);
  }
}
