import type {
  AuthUser,
  DiaryEntry,
  EmergencyContact,
  Profile,
  ScanHistoryEntry,
} from '@allerguide/core';
import {
  type BarcodeCacheRow,
  type StoredAliasFeedback,
  webCollections,
} from '@/src/db/web-collections';

export function insertProfile(params?: unknown[]): void {
  const profiles = webCollections.getProfiles();
  const id = profiles.length > 0 ? Math.max(...profiles.map((p) => p.id)) + 1 : 1;
  profiles.push({
    id,
    userId: params![0] as number,
    name: params![1] as string,
    birthYear: params![2] as number,
    type: params![3] as Profile['type'],
    allergies: params![4] as string,
    allergyConfirmations: (params![5] as string | undefined) ?? '{}',
    crossReactionAllergies: (params![6] as string | undefined) ?? '[]',
  });
  webCollections.saveProfiles(profiles);
}

export function upsertProfile(params?: unknown[]): void {
  const profiles = webCollections.getProfiles();
  const id = params![0] as number;
  const next: Profile = {
    id,
    userId: params![1] as number,
    name: params![2] as string,
    birthYear: params![3] as number,
    type: params![4] as Profile['type'],
    allergies: params![5] as string,
    allergyConfirmations: (params![6] as string | undefined) ?? '{}',
    crossReactionAllergies: (params![7] as string | undefined) ?? '[]',
  };
  const index = profiles.findIndex((profile) => profile.id === id);
  if (index >= 0) profiles[index] = next;
  else profiles.push(next);
  webCollections.saveProfiles(profiles);
}

export function upsertDiaryEntry(params?: unknown[]): void {
  const entries = webCollections.getDiaryEntries();
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
  webCollections.saveDiaryEntries(entries);
}

export function upsertScanHistory(params?: unknown[]): void {
  const entries = webCollections.getScanHistory();
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
  webCollections.saveScanHistory(entries);
}

export function upsertEmergencyContact(params?: unknown[]): void {
  const items = webCollections.getEmergencyContacts();
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
  webCollections.saveEmergencyContacts(items);
}

export function updateProfile(s: string, params?: unknown[]): void {
  const profiles = webCollections.getProfiles();
  const hasCrossReactionAllergies = s.includes('crossreactionallergies');
  const idIndex = hasCrossReactionAllergies ? 7 : 6;
  const id = params![idIndex] as number;
  const ownerId =
    hasCrossReactionAllergies && s.includes('and userid =')
      ? (params![idIndex + 1] as number)
      : undefined;
  const index = profiles.findIndex(
    (profile) => profile.id === id && (ownerId === undefined || profile.userId === ownerId),
  );
  if (index >= 0) {
    profiles[index] = {
      ...profiles[index],
      userId: params![0] as number,
      name: params![1] as string,
      birthYear: params![2] as number,
      type: params![3] as Profile['type'],
      allergies: params![4] as string,
      allergyConfirmations: (params![5] as string | undefined) ?? profiles[index].allergyConfirmations ?? '{}',
      crossReactionAllergies: hasCrossReactionAllergies
        ? ((params![6] as string | undefined) ?? '[]')
        : (profiles[index].crossReactionAllergies ?? '[]'),
    };
    webCollections.saveProfiles(profiles);
  }
}

export function deleteDiaryEntriesByProfileId(params?: unknown[]): void {
  const entries = webCollections.getDiaryEntries();
  webCollections.saveDiaryEntries(entries.filter((e) => e.profileId !== params![0]));
}

export function deleteDiaryEntryById(s: string, params?: unknown[]): void {
  const entries = webCollections.getDiaryEntries();
  const profileId = s.includes('and profileid =') ? params![1] : undefined;
  webCollections.saveDiaryEntries(
    entries.filter(
      (entry) =>
        entry.id !== params![0] ||
        (profileId !== undefined && entry.profileId !== profileId),
    ),
  );
}

export function updateDiaryEntry(s: string, params?: unknown[]): void {
  const entries = webCollections.getDiaryEntries();
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
    webCollections.saveDiaryEntries(entries);
  }
}

export function deleteScanHistoryByProfileId(params?: unknown[]): void {
  const entries = webCollections.getScanHistory();
  webCollections.saveScanHistory(entries.filter((entry) => entry.profileId !== params![0]));
}

export function insertScanHistory(params?: unknown[]): void {
  const entries = webCollections.getScanHistory();
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
  webCollections.saveScanHistory(entries);
}

export function upsertProfileSos(params?: unknown[]): void {
  const data = webCollections.getProfileSos();
  data[params![0] as number] = params![1] as string;
  webCollections.saveProfileSos(data);
}

export function deleteEmergencyContactsByProfileId(params?: unknown[]): void {
  const items = webCollections.getEmergencyContacts();
  webCollections.saveEmergencyContacts(items.filter((item) => item.profileId !== params![0]));
}

export function deleteEmergencyContactById(params?: unknown[]): void {
  const items = webCollections.getEmergencyContacts();
  webCollections.saveEmergencyContacts(items.filter((item) => item.id !== params![0]));
}

export function deleteProfile(s: string, params?: unknown[]): void {
  const profiles = webCollections.getProfiles();
  const profileId = params![0] as number;
  const ownerId = s.includes('and userid =') ? (params![1] as number) : undefined;
  const canDelete = profiles.some(
    (profile) =>
      profile.id === profileId && (ownerId === undefined || profile.userId === ownerId),
  );
  if (!canDelete) return;

  webCollections.saveProfiles(profiles.filter((profile) => profile.id !== profileId));
  const contacts = webCollections.getEmergencyContacts();
  webCollections.saveEmergencyContacts(contacts.filter((item) => item.profileId !== profileId));
  const diary = webCollections.getDiaryEntries();
  webCollections.saveDiaryEntries(diary.filter((entry) => entry.profileId !== profileId));
  const scans = webCollections.getScanHistory();
  webCollections.saveScanHistory(scans.filter((entry) => entry.profileId !== profileId));
  const safeProducts = webCollections.getSafeProducts();
  webCollections.saveSafeProducts(safeProducts.filter((item) => item.profileId !== profileId));
  const sos = webCollections.getProfileSos();
  delete sos[profileId];
  webCollections.saveProfileSos(sos);
}

export function insertEmergencyContact(params?: unknown[]): void {
  const items = webCollections.getEmergencyContacts();
  const id = items.length > 0 ? Math.max(...items.map((item) => item.id)) + 1 : 1;
  items.push({
    id,
    profileId: params![0] as number,
    name: params![1] as string,
    phone: params![2] as string,
    relation: params![3] as EmergencyContact['relation'],
  });
  webCollections.saveEmergencyContacts(items);
}

export function insertSafeProduct(params?: unknown[]): void {
  const items = webCollections.getSafeProducts();
  const id = items.length > 0 ? Math.max(...items.map((item) => item.id)) + 1 : 1;
  items.push({
    id,
    profileId: params![0] as number,
    name: params![1] as string,
    mode: params![2] as string,
    input: params![3] as string,
    savedAt: params![4] as string,
  });
  webCollections.saveSafeProducts(items);
}

export function deleteSafeProductByIdAndProfile(params?: unknown[]): void {
  const items = webCollections.getSafeProducts();
  webCollections.saveSafeProducts(
    items.filter((item) => !(item.id === params![0] && item.profileId === params![1])),
  );
}

export function deleteSafeProductById(params?: unknown[]): void {
  const items = webCollections.getSafeProducts();
  webCollections.saveSafeProducts(items.filter((item) => item.id !== params![0]));
}

export function insertAliasFeedback(params?: unknown[]): void {
  const items = webCollections.getAliasFeedback();
  const next: StoredAliasFeedback = {
    id: params![0] as string,
    term: params![1] as string,
    suggested_allergen_id: (params![2] as string | null) ?? null,
    context: (params![3] as string | null) ?? null,
    profile_id: (params![4] as number | null) ?? null,
    scan_input: (params![5] as string | null) ?? null,
    status: params![6] as string,
    created_at: params![7] as string,
  };
  const index = items.findIndex((item) => item.id === next.id);
  if (index >= 0) items[index] = next;
  else items.push(next);
  webCollections.saveAliasFeedback(items);
}

export function deleteAliasFeedbackById(params?: unknown[]): void {
  const items = webCollections.getAliasFeedback();
  webCollections.saveAliasFeedback(items.filter((item) => item.id !== params![0]));
}

export function deleteAllAliasFeedback(): void {
  webCollections.saveAliasFeedback([]);
}

export function deleteSafeProductsByProfileId(params?: unknown[]): void {
  const items = webCollections.getSafeProducts();
  webCollections.saveSafeProducts(items.filter((item) => item.profileId !== params![0]));
}

export function insertDiaryEntry(params?: unknown[]): void {
  const entries = webCollections.getDiaryEntries();
  const id = entries.length > 0 ? Math.max(...entries.map((e) => e.id)) + 1 : 1;
  entries.push({
    id,
    profileId: params![0] as number,
    type: params![1] as string,
    details: params![2] as string,
    createdAt: params![3] as string,
  });
  webCollections.saveDiaryEntries(entries);
}

export function insertDiaryAttachment(params?: unknown[]): void {
  const items = webCollections.getDiaryAttachments();
  const id = items.length > 0 ? Math.max(...items.map((item) => item.id)) + 1 : 1;
  items.push({
    id,
    entryId: params![0] as number,
    kind: params![1] as string,
    localPath: params![2] as string,
    createdAt: params![3] as string,
  });
  webCollections.saveDiaryAttachments(items);
}

export function deleteDiaryAttachmentsByEntryId(params?: unknown[]): void {
  const items = webCollections.getDiaryAttachments();
  webCollections.saveDiaryAttachments(items.filter((item) => item.entryId !== params![0]));
}

export function upsertAppSetting(params?: unknown[]): void {
  const settings = webCollections.getSettings();
  settings[params![0] as string] = params![1] as string;
  webCollections.saveSettings(settings);
}

export function insertUser(params?: unknown[]): void {
  const users = webCollections.getUsers();
  const id = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
  users.push({
    id,
    login: params![0] as string,
    loginType: params![1] as AuthUser['loginType'],
    passwordHash: params![2] as string,
    createdAt: params![3] as string,
  });
  webCollections.saveUsers(users);
}

export function upsertBarcodeCache(params?: unknown[]): void {
  const rows = webCollections.getBarcodeCache();
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
  webCollections.saveBarcodeCache(rows);
}

export function getAppSettingByKey<T>(params?: unknown[]): T | null {
  const settings = webCollections.getSettings();
  const value = settings[params![0] as string];
  return value != null ? ({ value } as T) : null;
}

export function getUserByLogin<T>(params?: unknown[]): T | null {
  const users = webCollections.getUsers();
  return (users.find((u) => u.login === params![0]) || null) as T | null;
}

export function getUserById<T>(params?: unknown[]): T | null {
  const users = webCollections.getUsers();
  return (users.find((u) => u.id === params![0]) || null) as T | null;
}

export function getLatestProfile<T>(s: string, params?: unknown[]): T | null {
  const profiles = webCollections.getProfiles();
  const ownerId = s.includes('where userid =') ? (params![0] as number) : undefined;
  const profile = profiles
    .filter((item) => ownerId === undefined || item.userId === ownerId)
    .sort((left, right) => right.id - left.id)[0];
  return (profile || null) as T | null;
}

export function getProfileById<T>(s: string, params?: unknown[]): T | null {
  const profiles = webCollections.getProfiles();
  const ownerId = s.includes('and userid =') ? (params![1] as number) : undefined;
  return (
    profiles.find(
      (profile) =>
        profile.id === params![0] &&
        (ownerId === undefined || profile.userId === ownerId),
    ) || null
  ) as T | null;
}

export function getProfileSosNotes<T>(params?: unknown[]): T | null {
  const data = webCollections.getProfileSos();
  const notes = data[params![0] as number];
  return notes != null ? ({ notes } as T) : null;
}

export function getDiaryEntryByProfileTypeAndCreatedAt<T>(params?: unknown[]): T | null {
  const entries = webCollections.getDiaryEntries();
  const match = entries
    .filter(
      (e) =>
        e.profileId === params![0] && e.type === params![1] && e.createdAt === params![2],
    )
    .sort((a, b) => b.id - a.id)[0];
  return (match || null) as T | null;
}

export function getDiaryEntryByProfileId<T>(params?: unknown[]): T | null {
  const entries = webCollections.getDiaryEntries();
  return (entries.find((e) => e.profileId === params![0]) || null) as T | null;
}

export function getDiaryEntryById<T>(params?: unknown[]): T | null {
  const entries = webCollections.getDiaryEntries();
  return (entries.find((entry) => entry.id === params![0]) || null) as T | null;
}

export function getBarcodeCacheByBarcode<T>(params?: unknown[]): T | null {
  const rows = webCollections.getBarcodeCache();
  return (rows.find((row) => row.barcode === params![0]) || null) as T | null;
}

export function countBarcodeCache<T>(): T {
  const rows = webCollections.getBarcodeCache();
  return { count: rows.length } as T;
}

export function listProfilesByUserId<T>(params?: unknown[]): T[] {
  const profiles = webCollections.getProfiles();
  return profiles.filter((profile) => profile.userId === params![0]).reverse() as T[];
}

export function listProfiles<T>(): T[] {
  return [...webCollections.getProfiles()].reverse() as T[];
}

export function listDiaryAttachmentsByEntryIds<T>(params?: unknown[]): T[] {
  const items = webCollections.getDiaryAttachments();
  const ids = new Set((params ?? []) as number[]);
  return items.filter((item) => ids.has(item.entryId)) as T[];
}

export function listDiaryAttachmentsByEntryId<T>(params?: unknown[]): T[] {
  const items = webCollections.getDiaryAttachments();
  return items.filter((item) => item.entryId === params![0]) as T[];
}

export function listDiaryEntriesByProfileId<T>(params?: unknown[]): T[] {
  const entries = webCollections.getDiaryEntries();
  return entries.filter((e) => e.profileId === params![0]).reverse() as T[];
}

export function listScanHistoryByProfileId<T>(params?: unknown[]): T[] {
  const entries = webCollections.getScanHistory();
  return entries.filter((entry) => entry.profileId === params![0]).reverse() as T[];
}

export function listEmergencyContactsByProfileId<T>(params?: unknown[]): T[] {
  const items = webCollections.getEmergencyContacts();
  return items.filter((item) => item.profileId === params![0]) as T[];
}

export function listSafeProductsByProfileId<T>(params?: unknown[]): T[] {
  const items = webCollections.getSafeProducts();
  return items.filter((item) => item.profileId === params![0]).reverse() as T[];
}

export function listPendingAliasFeedback<T>(): T[] {
  const items = webCollections.getAliasFeedback();
  return items
    .filter((item) => item.status === 'pending')
    .sort((left, right) => right.created_at.localeCompare(left.created_at)) as T[];
}

export function listAliasFeedback<T>(): T[] {
  return [...webCollections.getAliasFeedback()] as T[];
}

export function listAppSettings<T>(): T[] {
  const settings = webCollections.getSettings();
  return Object.entries(settings).map(([key, value]) => ({ key, value })) as T[];
}

export function listDiaryEntries<T>(): T[] {
  return [...webCollections.getDiaryEntries()].reverse() as T[];
}
