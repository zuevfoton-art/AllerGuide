import type {
  AuthUser,
  DiaryEntry,
  EmergencyContact,
  Profile,
  SafeProduct,
  ScanHistoryEntry,
} from '@allerguide/core';
import { hydrateWebStore, loadJson, saveJson } from '@/src/db/web-store';

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

interface BarcodeCacheRow {
  barcode: string;
  name: string;
  ingredients: string;
  brand: string | null;
  origin_source: string;
  cached_at: string;
  updated_at: string;
  declared_allergen_ids?: string | null;
  trace_allergen_ids?: string | null;
}

class WebDb implements DbLike {
  private getProfiles(): Profile[] {
    const profiles = loadJson<Profile[]>('ag_profiles', []);
    return profiles.map((profile) => ({ ...profile, userId: profile.userId ?? 0 }));
  }

  private saveProfiles(profiles: Profile[]) {
    saveJson('ag_profiles', profiles);
  }

  private getDiaryEntries(): DiaryEntry[] {
    return loadJson<DiaryEntry[]>('ag_diary', []);
  }

  private saveDiaryEntries(entries: DiaryEntry[]) {
    saveJson('ag_diary', entries);
  }

  private getScanHistory(): ScanHistoryEntry[] {
    return loadJson<ScanHistoryEntry[]>('ag_scan_history', []);
  }

  private saveScanHistory(entries: ScanHistoryEntry[]) {
    saveJson('ag_scan_history', entries);
  }

  private getProfileSos(): Record<number, string> {
    return loadJson<Record<number, string>>('ag_profile_sos', {});
  }

  private saveProfileSos(data: Record<number, string>) {
    saveJson('ag_profile_sos', data);
  }

  private getSettings(): Record<string, string> {
    return loadJson<Record<string, string>>('ag_settings', {});
  }

  private saveSettings(settings: Record<string, string>) {
    saveJson('ag_settings', settings);
  }

  private getUsers(): StoredUser[] {
    return loadJson<StoredUser[]>('ag_users', []);
  }

  private saveUsers(users: StoredUser[]) {
    saveJson('ag_users', users);
  }

  private getEmergencyContacts(): EmergencyContact[] {
    return loadJson<EmergencyContact[]>('ag_emergency_contacts', []);
  }

  private saveEmergencyContacts(items: EmergencyContact[]) {
    saveJson('ag_emergency_contacts', items);
  }

  private getBarcodeCache(): BarcodeCacheRow[] {
    return loadJson<BarcodeCacheRow[]>('ag_barcode_cache', []);
  }

  private saveBarcodeCache(rows: BarcodeCacheRow[]) {
    saveJson('ag_barcode_cache', rows);
  }

  private getSafeProducts(): SafeProduct[] {
    return loadJson<SafeProduct[]>('ag_safe_products', []);
  }

  private saveSafeProducts(items: SafeProduct[]) {
    saveJson('ag_safe_products', items);
  }

  private getDiaryAttachments(): {
    id: number;
    entryId: number;
    kind: string;
    localPath: string;
    createdAt: string;
  }[] {
    return loadJson('ag_diary_attachments', []);
  }

  private saveDiaryAttachments(
    items: { id: number; entryId: number; kind: string; localPath: string; createdAt: string }[],
  ) {
    saveJson('ag_diary_attachments', items);
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
        allergyConfirmations: (params![5] as string | undefined) ?? '{}',
      });
      this.saveProfiles(profiles);
      return;
    }

    if (s.startsWith('insert or replace into profiles')) {
      const profiles = this.getProfiles();
      const id = params![0] as number;
      const next: Profile = {
        id,
        userId: params![1] as number,
        name: params![2] as string,
        birthYear: params![3] as number,
        type: params![4] as Profile['type'],
        allergies: params![5] as string,
        allergyConfirmations: (params![6] as string | undefined) ?? '{}',
      };
      const index = profiles.findIndex((profile) => profile.id === id);
      if (index >= 0) profiles[index] = next;
      else profiles.push(next);
      this.saveProfiles(profiles);
      return;
    }

    if (s.startsWith('insert or replace into diary_entries')) {
      const entries = this.getDiaryEntries();
      const id = params![0] as number;
      const next: DiaryEntry = {
        id,
        profileId: params![1] as number,
        type: params![2] as string,
        details: params![3] as string,
        createdAt: params![4] as string,
      };
      const index = entries.findIndex((entry) => entry.id === id);
      if (index >= 0) entries[index] = next;
      else entries.push(next);
      this.saveDiaryEntries(entries);
      return;
    }

    if (s.startsWith('insert or replace into scan_history')) {
      const entries = this.getScanHistory();
      const id = params![0] as number;
      const next: ScanHistoryEntry = {
        id,
        profileId: params![1] as number,
        mode: params![2] as string,
        input: params![3] as string,
        verdict: params![4] as string,
        matches: params![5] as string,
        level: params![6] as string,
        productName: (params![7] as string | null) ?? null,
        source: params![8] as string,
        createdAt: params![9] as string,
      };
      const index = entries.findIndex((entry) => entry.id === id);
      if (index >= 0) entries[index] = next;
      else entries.push(next);
      this.saveScanHistory(entries);
      return;
    }

    if (s.startsWith('insert or replace into emergency_contacts')) {
      const items = this.getEmergencyContacts();
      const id = params![0] as number;
      const next: EmergencyContact = {
        id,
        profileId: params![1] as number,
        name: params![2] as string,
        phone: params![3] as string,
        relation: params![4] as EmergencyContact['relation'],
      };
      const index = items.findIndex((item) => item.id === id);
      if (index >= 0) items[index] = next;
      else items.push(next);
      this.saveEmergencyContacts(items);
      return;
    }

    if (s.startsWith('update profiles')) {
      const profiles = this.getProfiles();
      const id = params![6] as number;
      const index = profiles.findIndex((p) => p.id === id);
      if (index >= 0) {
        profiles[index] = {
          ...profiles[index],
          userId: params![0] as number,
          name: params![1] as string,
          birthYear: params![2] as number,
          type: params![3] as Profile['type'],
          allergies: params![4] as string,
          allergyConfirmations: (params![5] as string | undefined) ?? profiles[index].allergyConfirmations ?? '{}',
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
      const profileId = s.includes('and profileid =') ? params![1] : undefined;
      this.saveDiaryEntries(
        entries.filter(
          (entry) =>
            entry.id !== params![0] ||
            (profileId !== undefined && entry.profileId !== profileId),
        ),
      );
      return;
    }

    if (s.startsWith('update diary_entries')) {
      const entries = this.getDiaryEntries();
      const id = params![2] as number;
      const profileId = s.includes('and profileid =') ? params![3] : undefined;
      const index = entries.findIndex(
        (entry) =>
          entry.id === id &&
          (profileId === undefined || entry.profileId === profileId),
      );
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
      const safeProducts = this.getSafeProducts();
      this.saveSafeProducts(safeProducts.filter((item) => item.profileId !== params![0]));
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

    if (s.startsWith('insert into safe_products')) {
      const items = this.getSafeProducts();
      const id = items.length > 0 ? Math.max(...items.map((item) => item.id)) + 1 : 1;
      items.push({
        id,
        profileId: params![0] as number,
        name: params![1] as string,
        mode: params![2] as string,
        input: params![3] as string,
        savedAt: params![4] as string,
      });
      this.saveSafeProducts(items);
      return;
    }

    if (s.startsWith('delete from safe_products where id =')) {
      const items = this.getSafeProducts();
      this.saveSafeProducts(items.filter((item) => item.id !== params![0]));
      return;
    }

    if (s.startsWith('delete from safe_products where profileid =')) {
      const items = this.getSafeProducts();
      this.saveSafeProducts(items.filter((item) => item.profileId !== params![0]));
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

    if (s.startsWith('insert into diary_attachments')) {
      const items = this.getDiaryAttachments();
      const id = items.length > 0 ? Math.max(...items.map((item) => item.id)) + 1 : 1;
      items.push({
        id,
        entryId: params![0] as number,
        kind: params![1] as string,
        localPath: params![2] as string,
        createdAt: params![3] as string,
      });
      this.saveDiaryAttachments(items);
      return;
    }

    if (s.startsWith('delete from diary_attachments where entryid =')) {
      const items = this.getDiaryAttachments();
      this.saveDiaryAttachments(items.filter((item) => item.entryId !== params![0]));
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

    if (s.startsWith('insert or replace into barcode_cache')) {
      const rows = this.getBarcodeCache();
      const next: BarcodeCacheRow = {
        barcode: params![0] as string,
        name: params![1] as string,
        ingredients: params![2] as string,
        brand: (params![3] as string | null) ?? null,
        origin_source: params![4] as string,
        cached_at: params![5] as string,
        updated_at: params![6] as string,
        declared_allergen_ids: (params![7] as string | null) ?? null,
        trace_allergen_ids: (params![8] as string | null) ?? null,
      };
      const index = rows.findIndex((row) => row.barcode === next.barcode);
      if (index >= 0) rows[index] = next;
      else rows.push(next);
      this.saveBarcodeCache(rows);
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

    if (s.includes('from diary_entries') && s.includes('where profileid =') && s.includes('and type =')) {
      const entries = this.getDiaryEntries();
      const match = entries
        .filter(
          (e) =>
            e.profileId === params![0] && e.type === params![1] && e.createdAt === params![2],
        )
        .sort((a, b) => b.id - a.id)[0];
      return (match || null) as T | null;
    }

    if (s.includes('from diary_entries') && s.includes('where profileid =')) {
      const entries = this.getDiaryEntries();
      return (entries.find((e) => e.profileId === params![0]) || null) as T | null;
    }

    if (s.includes('from diary_entries') && s.includes('where id =')) {
      const entries = this.getDiaryEntries();
      return (entries.find((entry) => entry.id === params![0]) || null) as T | null;
    }

    if (s.includes('from barcode_cache') && s.includes('where barcode =')) {
      const rows = this.getBarcodeCache();
      return (rows.find((row) => row.barcode === params![0]) || null) as T | null;
    }

    if (s.includes('from barcode_cache') && s.includes('count(*)')) {
      const rows = this.getBarcodeCache();
      return { count: rows.length } as T;
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

    if (s.includes('from diary_attachments') && s.includes('where entryid in')) {
      const items = this.getDiaryAttachments();
      const ids = new Set((params ?? []) as number[]);
      return items.filter((item) => ids.has(item.entryId)) as T[];
    }

    if (s.includes('from diary_attachments') && s.includes('where entryid =')) {
      const items = this.getDiaryAttachments();
      return items.filter((item) => item.entryId === params![0]) as T[];
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

    if (s.includes('from safe_products') && s.includes('where profileid =')) {
      const items = this.getSafeProducts();
      return items.filter((item) => item.profileId === params![0]).reverse() as T[];
    }

    if (s.includes('from app_settings')) {
      const settings = this.getSettings();
      return Object.entries(settings).map(([key, value]) => ({ key, value })) as T[];
    }

    if (s.includes('from diary_entries')) {
      return [...this.getDiaryEntries()].reverse() as T[];
    }

    return [];
  }
}

const db: DbLike = new WebDb();

export async function initDb() {
  await hydrateWebStore();
}

export function getDb() {
  return db;
}
