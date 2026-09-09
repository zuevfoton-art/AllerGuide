import type {
  AuthUser,
  DiaryEntry,
  EmergencyContact,
  Profile,
  SafeProduct,
  ScanHistoryEntry,
} from '@allerguide/core';
import { loadJson, saveJson } from '@/src/db/web-store';

export interface StoredUser extends AuthUser {
  passwordHash: string;
  createdAt: string;
}

export interface StoredAliasFeedback {
  id: string;
  term: string;
  suggested_allergen_id: string | null;
  context: string | null;
  profile_id: number | null;
  scan_input: string | null;
  status: string;
  created_at: string;
}

export interface BarcodeCacheRow {
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

export interface StoredDiaryAttachment {
  id: number;
  entryId: number;
  kind: string;
  localPath: string;
  createdAt: string;
}

export const webCollections = {
  getProfiles(): Profile[] {
    const profiles = loadJson<Profile[]>('ag_profiles', []);
    return profiles.map((profile) => ({ ...profile, userId: profile.userId ?? 0 }));
  },

  saveProfiles(profiles: Profile[]) {
    saveJson('ag_profiles', profiles);
  },

  getDiaryEntries(): DiaryEntry[] {
    return loadJson<DiaryEntry[]>('ag_diary', []);
  },

  saveDiaryEntries(entries: DiaryEntry[]) {
    saveJson('ag_diary', entries);
  },

  getScanHistory(): ScanHistoryEntry[] {
    return loadJson<ScanHistoryEntry[]>('ag_scan_history', []);
  },

  saveScanHistory(entries: ScanHistoryEntry[]) {
    saveJson('ag_scan_history', entries);
  },

  getProfileSos(): Record<number, string> {
    return loadJson<Record<number, string>>('ag_profile_sos', {});
  },

  saveProfileSos(data: Record<number, string>) {
    saveJson('ag_profile_sos', data);
  },

  getSettings(): Record<string, string> {
    return loadJson<Record<string, string>>('ag_settings', {});
  },

  saveSettings(settings: Record<string, string>) {
    saveJson('ag_settings', settings);
  },

  getUsers(): StoredUser[] {
    return loadJson<StoredUser[]>('ag_users', []);
  },

  saveUsers(users: StoredUser[]) {
    saveJson('ag_users', users);
  },

  getEmergencyContacts(): EmergencyContact[] {
    return loadJson<EmergencyContact[]>('ag_emergency_contacts', []);
  },

  saveEmergencyContacts(items: EmergencyContact[]) {
    saveJson('ag_emergency_contacts', items);
  },

  getBarcodeCache(): BarcodeCacheRow[] {
    return loadJson<BarcodeCacheRow[]>('ag_barcode_cache', []);
  },

  saveBarcodeCache(rows: BarcodeCacheRow[]) {
    saveJson('ag_barcode_cache', rows);
  },

  getSafeProducts(): SafeProduct[] {
    return loadJson<SafeProduct[]>('ag_safe_products', []);
  },

  saveSafeProducts(items: SafeProduct[]) {
    saveJson('ag_safe_products', items);
  },

  getAliasFeedback(): StoredAliasFeedback[] {
    return loadJson<StoredAliasFeedback[]>('ag_alias_feedback', []);
  },

  saveAliasFeedback(items: StoredAliasFeedback[]) {
    saveJson('ag_alias_feedback', items);
  },

  getDiaryAttachments(): StoredDiaryAttachment[] {
    return loadJson<StoredDiaryAttachment[]>('ag_diary_attachments', []);
  },

  saveDiaryAttachments(items: StoredDiaryAttachment[]) {
    saveJson('ag_diary_attachments', items);
  },
};
