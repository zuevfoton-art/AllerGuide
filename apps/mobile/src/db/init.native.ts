import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

const db = SQLite.openDatabaseSync('allerguide.db');
let initialized = false;

export function initDb() {
  if (initialized) return db;

  db.execSync(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      name TEXT NOT NULL,
      birthYear INTEGER,
      type TEXT,
      allergies TEXT,
      allergyConfirmations TEXT NOT NULL DEFAULT '{}',
      crossReactionAllergies TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS diary_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profileId INTEGER NOT NULL,
      type TEXT NOT NULL,
      details TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scan_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profileId INTEGER NOT NULL,
      mode TEXT NOT NULL,
      input TEXT NOT NULL,
      verdict TEXT NOT NULL,
      matches TEXT NOT NULL,
      level TEXT NOT NULL,
      productName TEXT,
      source TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT NOT NULL UNIQUE,
      loginType TEXT NOT NULL,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profileId INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      relation TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS profile_sos (
      profileId INTEGER PRIMARY KEY,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS barcode_cache (
      barcode TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      ingredients TEXT NOT NULL,
      brand TEXT,
      origin_source TEXT NOT NULL DEFAULT 'openfoodfacts',
      cached_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
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
    CREATE TABLE IF NOT EXISTS safe_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profileId INTEGER NOT NULL,
      name TEXT NOT NULL,
      mode TEXT NOT NULL,
      input TEXT NOT NULL,
      savedAt TEXT NOT NULL
    );
  `);

  runMigrations(db as unknown as import('./types').DbLike);
  initialized = true;
  return db;
}

export function persistDbWrites(): Promise<void> {
  // SQLite runSync commits before returning.
  return Promise.resolve();
}

export function getDb() {
  return initDb();
}
