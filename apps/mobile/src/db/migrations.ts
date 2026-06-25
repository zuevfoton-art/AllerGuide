import type { DbLike } from './types';
import { migrateProfileAllergiesJson, type Profile } from '@allerguide/core';

export const CURRENT_SCHEMA_VERSION = 5;

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
  3: (db) => {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS barcode_cache (
        barcode TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        ingredients TEXT NOT NULL,
        brand TEXT,
        origin_source TEXT NOT NULL DEFAULT 'openfoodfacts',
        cached_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  },
  4: (db) => {
    const profiles = db.getAllSync<Profile>('SELECT * FROM profiles');
    for (const profile of profiles) {
      const migrated = migrateProfileAllergiesJson(profile.allergies);
      if (migrated !== profile.allergies) {
        db.runSync('UPDATE profiles SET allergies = ? WHERE id = ?', [migrated, profile.id]);
      }
    }
  },
  5: (db) => {
    const columns = db.getAllSync<{ name: string }>('PRAGMA table_info(profiles)');
    if (!columns.some((column) => column.name === 'allergyConfirmations')) {
      db.execSync("ALTER TABLE profiles ADD COLUMN allergyConfirmations TEXT NOT NULL DEFAULT '{}'");
    }

    db.execSync(`
      CREATE TABLE IF NOT EXISTS catalog_allergen_snapshot (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        payload TEXT NOT NULL,
        fetched_at TEXT NOT NULL,
        source TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS catalog_products (
        barcode TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        brand TEXT NOT NULL DEFAULT '',
        image_url TEXT NOT NULL DEFAULT '',
        ingredients TEXT NOT NULL DEFAULT '',
        allergen_tags TEXT NOT NULL DEFAULT '[]',
        source TEXT NOT NULL DEFAULT 'cache',
        fetched_at TEXT NOT NULL
      );
    `);
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
