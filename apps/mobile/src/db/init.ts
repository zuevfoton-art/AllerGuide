import { Platform } from 'react-native';
import type { Profile, DiaryEntry } from '@/src/types';

interface DbLike {
  execSync: (sql: string) => void;
  runSync: (sql: string, params?: any[]) => void;
  getFirstSync: <T>(sql: string, params?: any[]) => T | null;
  getAllSync: <T>(sql: string, params?: any[]) => T[];
}

class WebDb implements DbLike {
  private getProfiles(): Profile[] {
    try { return JSON.parse(localStorage.getItem('profiles') || '[]'); } catch { return []; }
  }
  private saveProfiles(p: Profile[]) { localStorage.setItem('profiles', JSON.stringify(p)); }
  private getDiaryEntries(): DiaryEntry[] {
    try { return JSON.parse(localStorage.getItem('diary_entries') || '[]'); } catch { return []; }
  }
  private saveDiaryEntries(e: DiaryEntry[]) { localStorage.setItem('diary_entries', JSON.stringify(e)); }

  execSync(_sql: string) {}

  runSync(sql: string, params?: any[]) {
    const s = sql.trim().toLowerCase();
    if (s.startsWith('insert into profiles')) {
      const profiles = this.getProfiles();
      const id = profiles.length > 0 ? Math.max(...profiles.map(p => p.id)) + 1 : 1;
      profiles.push({ id, name: params![0], birthYear: params![1], type: params![2], allergies: params![3] } as Profile);
      this.saveProfiles(profiles);
    } else if (s.startsWith('insert into diary_entries')) {
      const entries = this.getDiaryEntries();
      const id = entries.length > 0 ? Math.max(...entries.map(e => e.id)) + 1 : 1;
      entries.push({ id, profileId: params![0], type: params![1], details: params![2], createdAt: params![3] } as DiaryEntry);
      this.saveDiaryEntries(entries);
    }
  }

  getFirstSync<T>(sql: string, params?: any[]): T | null {
    const s = sql.trim().toLowerCase();
    if (s.includes('from profiles') && s.includes('order by id desc limit 1')) {
      const profiles = this.getProfiles();
      return (profiles[profiles.length - 1] || null) as T | null;
    }
    if (s.includes('from profiles') && s.includes('where id =')) {
      const profiles = this.getProfiles();
      return (profiles.find(p => p.id === params![0]) || null) as T | null;
    }
    if (s.includes('from diary_entries') && s.includes('where profileid =')) {
      const entries = this.getDiaryEntries();
      return (entries.find(e => e.profileId === params![0]) || null) as T | null;
    }
    return null;
  }

  getAllSync<T>(sql: string, params?: any[]): T[] {
    const s = sql.trim().toLowerCase();
    if (s.includes('from profiles')) {
      const profiles = this.getProfiles();
      return [...profiles].reverse() as T[];
    }
    if (s.includes('from diary_entries') && s.includes('where profileid =')) {
      const entries = this.getDiaryEntries();
      return entries.filter(e => e.profileId === params![0]).reverse() as T[];
    }
    if (s.includes('from diary_entries')) {
      const entries = this.getDiaryEntries();
      return [...entries].reverse() as T[];
    }
    return [];
  }
}

let db: DbLike;

if (Platform.OS === 'web') {
  db = new WebDb();
} else {
  const SQLite = require('expo-sqlite');
  db = SQLite.openDatabaseSync('allerguide.db');
}

export function initDb() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  `);
}

export function getDb() {
  return db;
}
