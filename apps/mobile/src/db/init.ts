import type { AuthUser, EmergencyContact, Profile, DiaryEntry } from '@allerguide/core';

interface StoredUser extends AuthUser {
  passwordHash: string;
  createdAt: string;
}

interface DbLike {
  execSync: (sql: string) => void;
  runSync: (sql: string, params?: unknown[]) => void;
  getFirstSync: <T>(sql: string, params?: unknown[]) => T | null;
  getAllSync: <T>(sql: string, params?: unknown[]) => T[];
}

class WebDb implements DbLike {
  private getProfiles(): Profile[] {
    try {
      return JSON.parse(localStorage.getItem('ag_profiles') || '[]');
    } catch {
      return [];
    }
  }

  private saveProfiles(profiles: Profile[]) {
    localStorage.setItem('ag_profiles', JSON.stringify(profiles));
  }

  private getDiaryEntries(): DiaryEntry[] {
    try {
      return JSON.parse(localStorage.getItem('ag_diary') || '[]');
    } catch {
      return [];
    }
  }

  private saveDiaryEntries(entries: DiaryEntry[]) {
    localStorage.setItem('ag_diary', JSON.stringify(entries));
  }

  private getSettings(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem('ag_settings') || '{}');
    } catch {
      return {};
    }
  }

  private saveSettings(settings: Record<string, string>) {
    localStorage.setItem('ag_settings', JSON.stringify(settings));
  }

  private getUsers(): StoredUser[] {
    try {
      return JSON.parse(localStorage.getItem('ag_users') || '[]');
    } catch {
      return [];
    }
  }

  private saveUsers(users: StoredUser[]) {
    localStorage.setItem('ag_users', JSON.stringify(users));
  }

  private getEmergencyContacts(): EmergencyContact[] {
    try {
      return JSON.parse(localStorage.getItem('ag_emergency_contacts') || '[]');
    } catch {
      return [];
    }
  }

  private saveEmergencyContacts(items: EmergencyContact[]) {
    localStorage.setItem('ag_emergency_contacts', JSON.stringify(items));
  }

  private getProfileSos(): { profileId: number; notes: string }[] {
    try {
      return JSON.parse(localStorage.getItem('ag_profile_sos') || '[]');
    } catch {
      return [];
    }
  }

  private saveProfileSos(items: { profileId: number; notes: string }[]) {
    localStorage.setItem('ag_profile_sos', JSON.stringify(items));
  }

  execSync(_sql: string) {}

  runSync(sql: string, params?: unknown[]) {
    const s = sql.trim().toLowerCase();

    if (s.startsWith('insert into profiles')) {
      const profiles = this.getProfiles();
      const id = profiles.length > 0 ? Math.max(...profiles.map((p) => p.id)) + 1 : 1;
      profiles.push({
        id,
        name: params![0] as string,
        birthYear: params![1] as number,
        type: params![2] as Profile['type'],
        allergies: params![3] as string,
      });
      this.saveProfiles(profiles);
      return;
    }

    if (s.startsWith('update profiles')) {
      const profiles = this.getProfiles();
      const id = params![4] as number;
      const index = profiles.findIndex((p) => p.id === id);
      if (index >= 0) {
        profiles[index] = {
          ...profiles[index],
          name: params![0] as string,
          birthYear: params![1] as number,
          type: params![2] as Profile['type'],
          allergies: params![3] as string,
        };
        this.saveProfiles(profiles);
      }
      return;
    }

    if (s.startsWith('delete from diary_entries')) {
      const entries = this.getDiaryEntries();
      this.saveDiaryEntries(entries.filter((e) => e.profileId !== params![0]));
      return;
    }

    if (s.startsWith('delete from profiles')) {
      const profiles = this.getProfiles();
      this.saveProfiles(profiles.filter((p) => p.id !== params![0]));
      return;
    }

    if (s.startsWith('insert into diary_entries')) {
      const entries = this.getDiaryEntries();
      const id = entries.length > 0 ? Math.max(...entries.map((e) => e.id)) + 1 : 1;
      entries.push({
        id,
        profileId: params![0] as number,
        type: params![1] as string,
        details: params![2] as string,
        createdAt: params![3] as string,
      });
      this.saveDiaryEntries(entries);
      return;
    }

    if (s.startsWith('insert or replace into app_settings')) {
      const settings = this.getSettings();
      settings[params![0] as string] = params![1] as string;
      this.saveSettings(settings);
      return;
    }

    if (s.startsWith('insert into users')) {
      const users = this.getUsers();
      const id = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
      users.push({
        id,
        login: params![0] as string,
        loginType: params![1] as AuthUser['loginType'],
        passwordHash: params![2] as string,
        createdAt: params![3] as string,
      });
      this.saveUsers(users);
      return;
    }

    if (s.startsWith('insert into emergency_contacts')) {
      const items = this.getEmergencyContacts();
      const id = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
      items.push({
        id,
        profileId: params![0] as number,
        name: params![1] as string,
        phone: params![2] as string,
        relation: params![3] as string,
      });
      this.saveEmergencyContacts(items);
      return;
    }

    if (s.startsWith('delete from emergency_contacts')) {
      const items = this.getEmergencyContacts();
      this.saveEmergencyContacts(items.filter((i) => i.id !== params![0]));
      return;
    }

    if (s.startsWith('insert or replace into profile_sos')) {
      const items = this.getProfileSos().filter((i) => i.profileId !== params![0]);
      items.push({ profileId: params![0] as number, notes: params![1] as string });
      this.saveProfileSos(items);
    }
  }

  getFirstSync<T>(sql: string, params?: unknown[]): T | null {
    const s = sql.trim().toLowerCase();

    if (s.includes('from app_settings') && s.includes('where key =')) {
      const settings = this.getSettings();
      const value = settings[params![0] as string];
      return value != null ? ({ value } as T) : null;
    }

    if (s.includes('from users') && s.includes('where login =')) {
      const users = this.getUsers();
      return (users.find((u) => u.login === params![0]) || null) as T | null;
    }

    if (s.includes('from users') && s.includes('where id =')) {
      const users = this.getUsers();
      return (users.find((u) => u.id === params![0]) || null) as T | null;
    }

    if (s.includes('from profiles') && s.includes('order by id desc limit 1')) {
      const profiles = this.getProfiles();
      return (profiles[profiles.length - 1] || null) as T | null;
    }

    if (s.includes('from profiles') && s.includes('where id =')) {
      const profiles = this.getProfiles();
      return (profiles.find((p) => p.id === params![0]) || null) as T | null;
    }

    if (s.includes('from diary_entries') && s.includes('where profileid =')) {
      const entries = this.getDiaryEntries();
      return (entries.find((e) => e.profileId === params![0]) || null) as T | null;
    }

    if (s.includes('from profile_sos') && s.includes('where profileid =')) {
      const items = this.getProfileSos();
      return (items.find((i) => i.profileId === params![0]) || null) as T | null;
    }

    return null;
  }

  getAllSync<T>(sql: string, params?: unknown[]): T[] {
    const s = sql.trim().toLowerCase();

    if (s.includes('from profiles')) {
      return [...this.getProfiles()].reverse() as T[];
    }

    if (s.includes('from diary_entries') && s.includes('where profileid =')) {
      const entries = this.getDiaryEntries();
      return entries.filter((e) => e.profileId === params![0]).reverse() as T[];
    }

    if (s.includes('from diary_entries')) {
      return [...this.getDiaryEntries()].reverse() as T[];
    }

    if (s.includes('from emergency_contacts') && s.includes('where profileid =')) {
      const items = this.getEmergencyContacts().filter((i) => i.profileId === params![0]);
      return items as T[];
    }

    return [];
  }
}

const db: DbLike = new WebDb();

export function initDb() {}

export function getDb() {
  return db;
}
