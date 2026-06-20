import type { Profile, DiaryEntry } from '@/src/types';

interface DbLike {
  execSync: (sql: string) => void;
  runSync: (sql: string, params?: any[]) => void;
  getFirstSync: <T>(sql: string, params?: any[]) => T | null;
  getAllSync: <T>(sql: string, params?: any[]) => T[];
}

class WebDb implements DbLike {
  private getProfiles(): Profile[] {
    try { return JSON.parse(localStorage.getItem('ag_profiles') || '[]'); } catch { return []; }
  }
  private saveProfiles(p: Profile[]) { localStorage.setItem('ag_profiles', JSON.stringify(p)); }
  private getDiaryEntries(): DiaryEntry[] {
    try { return JSON.parse(localStorage.getItem('ag_diary') || '[]'); } catch { return []; }
  }
  private saveDiaryEntries(e: DiaryEntry[]) { localStorage.setItem('ag_diary', JSON.stringify(e)); }

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
      return [...this.getProfiles()].reverse() as T[];
    }
    if (s.includes('from diary_entries') && s.includes('where profileid =')) {
      const entries = this.getDiaryEntries();
      return entries.filter(e => e.profileId === params![0]).reverse() as T[];
    }
    if (s.includes('from diary_entries')) {
      return [...this.getDiaryEntries()].reverse() as T[];
    }
    return [];
  }
}

const db: DbLike = new WebDb();

export function initDb() {}

export function getDb() {
  return db;
}
