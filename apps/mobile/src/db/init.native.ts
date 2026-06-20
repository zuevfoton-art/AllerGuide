import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('allerguide.db');

function migrateDb() {
  const columns = db.getAllSync<{ name: string }>('PRAGMA table_info(profiles)');
  if (!columns.some((column) => column.name === 'userId')) {
    db.execSync('ALTER TABLE profiles ADD COLUMN userId INTEGER');
  }
}

export function initDb() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      name TEXT NOT NULL,
      birthYear INTEGER,
      type TEXT,
      allergies TEXT
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
  `);

  migrateDb();
}

export function getDb() {
  initDb();
  return db;
}
