import type {
  AuthUser,
  DiaryEntry,
  EmergencyContact,
  Profile,
  ScanHistoryEntry,
} from '@allerguide/core';

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
      const profiles = JSON.parse(localStorage.getItem('ag_profiles') || '[]') as Profile[];
      return profiles.map((profile) => ({ ...profile, userId: profile.userId ?? 0 }));
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

  private getScanHistory(): ScanHistoryEntry[] {
    try {
      return JSON.parse(localStorage.getItem('ag_scan_history') || '[]');
    } catch {
      return [];
    }
  }

  private saveScanHistory(entries: ScanHistoryEntry[]) {
    localStorage.setItem('ag_scan_history', JSON.stringify(entries));
  }

  private getProfileSos(): Record<number, string> {
    try {
      return JSON.parse(localStorage.getItem('ag_profile_sos') || '{}');
    } catch {
      return {};
    }
  }

  private saveProfileSos(data: Record<number, string>) {
    localStorage.setItem('ag_profile_sos', JSON.stringify(data));
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

  execSync(_sql: string) {}

  runSync(sql: string, params?: unknown[]) {
    const s = sql.trim().toLowerCase();

    if (s.startsWith('insert into profiles')) {
      const profiles = this.getProfiles();
      const id = profiles.length > 0 ? Math.max(...profiles.map((p) => p.id)) + 1 : 1;
      profiles.push({
        id,
        userId: params![0] as number,
        name: params![1] as string,
        birthYear: params![2] as number,
        type: params![3] as Profile['type'],
        allergies: params![4] as string,
      });
      this.saveProfiles(profiles);
      return;
    }

    if (s.startsWith('update profiles')) {
      const profiles = this.getProfiles();
      const id = params![5] as number;
      const index = profiles.findIndex((p) => p.id === id);
      if (index >= 0) {
        profiles[index] = {
          ...profiles[index],
          userId: params![0] as number,
          name: params![1] as string,
          birthYear: params![2] as number,
          type: params![3] as Profile['type'],
          allergies: params![4] as string,
        };
        this.saveProfiles(profiles);
      }
      return;
    }

    if (s.startsWith('delete from diary_entries where profileid')) {
      const entries = this.getDiaryEntries();
      this.saveDiaryEntries(entries.filter((e) => e.profileId !== params![0]));
      return;
    }

    if (s.startsWith('delete from diary_entries where id')) {
      const entries = this.getDiaryEntries();
      this.saveDiaryEntries(entries.filter((e) => e.id !== params![0]));
      return;
    }

    if (s.startsWith('update diary_entries')) {
      const entries = this.getDiaryEntries();
      const id = params![2] as number;
      const index = entries.findIndex((entry) => entry.id === id);
      if (index >= 0) {
        entries[index] = {
          ...entries[index],
          type: params![0] as string,
          details: params![1] as string,
        };
        this.saveDiaryEntries(entries);
      }
      return;
    }

    if (s.startsWith('delete from scan_history where profileid')) {
      const entries = this.getScanHistory();
      this.saveScanHistory(entries.filter((entry) => entry.profileId !== params![0]));
      return;
    }

    if (s.startsWith('insert into scan_history')) {
      const entries = this.getScanHistory();
      const id = entries.length > 0 ? Math.max(...entries.map((entry) => entry.id)) + 1 : 1;
      entries.push({
        id,
        profileId: params![0] as number,
        mode: params![1] as string,
        input: params![2] as string,
        verdict: params![3] as string,
        matches: params![4] as string,
        level: params![5] as string,
        productName: (params![6] as string | null) ?? null,
        source: params![7] as string,
        createdAt: params![8] as string,
      });
      this.saveScanHistory(entries);
      return;
    }

    if (s.startsWith('insert or replace into profile_sos')) {
      const data = this.getProfileSos();
      data[params![0] as number] = params![1] as string;
      this.saveProfileSos(data);
      return;
    }

    if (s.startsWith('delete from emergency_contacts where profileid =')) {
      const items = this.getEmergencyContacts();
      this.saveEmergencyContacts(items.filter((item) => item.profileId !== params![0]));
      return;
    }

    if (s.startsWith('delete from emergency_contacts')) {
      const items = this.getEmergencyContacts();
      this.saveEmergencyContacts(items.filter((item) => item.id !== params![0]));
      return;
    }

    if (s.startsWith('delete from profiles')) {
      const profiles = this.getProfiles();
      this.saveProfiles(profiles.filter((p) => p.id !== params![0]));
      const contacts = this.getEmergencyContacts();
      this.saveEmergencyContacts(contacts.filter((item) => item.profileId !== params![0]));
      const diary = this.getDiaryEntries();
      this.saveDiaryEntries(diary.filter((entry) => entry.profileId !== params![0]));
      const scans = this.getScanHistory();
      this.saveScanHistory(scans.filter((entry) => entry.profileId !== params![0]));
      const sos = this.getProfileSos();
      delete sos[params![0] as number];
      this.saveProfileSos(sos);
      return;
    }

    if (s.startsWith('insert into emergency_contacts')) {
      const items = this.getEmergencyContacts();
      const id = items.length > 0 ? Math.max(...items.map((item) => item.id)) + 1 : 1;
      items.push({
        id,
        profileId: params![0] as number,
        name: params![1] as string,
        phone: params![2] as string,
        relation: params![3] as EmergencyContact['relation'],
      });
      this.saveEmergencyContacts(items);
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

    if (s.includes('from profile_sos')) {
      const data = this.getProfileSos();
      const notes = data[params![0] as number];
      return notes != null ? ({ notes } as T) : null;
    }

    if (s.includes('from diary_entries') && s.includes('where profileid =')) {
      const entries = this.getDiaryEntries();
      return (entries.find((e) => e.profileId === params![0]) || null) as T | null;
    }

    return null;
  }

  getAllSync<T>(sql: string, params?: unknown[]): T[] {
    const s = sql.trim().toLowerCase();

    if (s.includes('from profiles') && s.includes('where userid =')) {
      const profiles = this.getProfiles();
      return profiles.filter((profile) => profile.userId === params![0]).reverse() as T[];
    }

    if (s.includes('from profiles')) {
      return [...this.getProfiles()].reverse() as T[];
    }

    if (s.includes('from diary_entries') && s.includes('where profileid =')) {
      const entries = this.getDiaryEntries();
      return entries.filter((e) => e.profileId === params![0]).reverse() as T[];
    }

    if (s.includes('from scan_history') && s.includes('where profileid =')) {
      const entries = this.getScanHistory();
      return entries.filter((entry) => entry.profileId === params![0]).reverse() as T[];
    }

    if (s.includes('from emergency_contacts') && s.includes('where profileid =')) {
      const items = this.getEmergencyContacts();
      return items.filter((item) => item.profileId === params![0]) as T[];
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
