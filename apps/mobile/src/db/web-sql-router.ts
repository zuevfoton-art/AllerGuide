import {
  countBarcodeCache,
  deleteAliasFeedbackById,
  deleteAllAliasFeedback,
  deleteDiaryAttachmentsByEntryId,
  deleteDiaryEntriesByProfileId,
  deleteDiaryEntryById,
  deleteEmergencyContactById,
  deleteEmergencyContactsByProfileId,
  deleteProfile,
  deleteSafeProductById,
  deleteSafeProductByIdAndProfile,
  deleteSafeProductsByProfileId,
  deleteScanHistoryByProfileId,
  getAppSettingByKey,
  getBarcodeCacheByBarcode,
  getDiaryEntryById,
  getDiaryEntryByProfileId,
  getDiaryEntryByProfileTypeAndCreatedAt,
  getLatestProfile,
  getProfileById,
  getProfileSosNotes,
  getUserById,
  getUserByLogin,
  insertAliasFeedback,
  insertDiaryAttachment,
  insertDiaryEntry,
  insertEmergencyContact,
  insertProfile,
  insertSafeProduct,
  insertScanHistory,
  insertUser,
  listAliasFeedback,
  listAppSettings,
  listDiaryAttachmentsByEntryId,
  listDiaryAttachmentsByEntryIds,
  listDiaryEntries,
  listDiaryEntriesByProfileId,
  listEmergencyContactsByProfileId,
  listPendingAliasFeedback,
  listProfiles,
  listProfilesByUserId,
  listSafeProductsByProfileId,
  listScanHistoryByProfileId,
  updateDiaryEntry,
  updateProfile,
  upsertAppSetting,
  upsertBarcodeCache,
  upsertDiaryEntry,
  upsertEmergencyContact,
  upsertProfile,
  upsertProfileSos,
  upsertScanHistory,
} from '@/src/db/web-sql-handlers';

export function normalizeSql(sql: string): string {
  return sql.trim().toLowerCase();
}

function warnUnmatched(sql: string): void {
  console.warn('[WebDb] unmatched SQL', sql);
}

export function routeRunSync(sql: string, params?: unknown[]): void {
  const s = normalizeSql(sql);

  if (s.startsWith('insert into profiles')) {
    insertProfile(params);
    return;
  }

  if (s.startsWith('insert or replace into profiles')) {
    upsertProfile(params);
    return;
  }

  if (s.startsWith('insert or replace into diary_entries')) {
    upsertDiaryEntry(params);
    return;
  }

  if (s.startsWith('insert or replace into scan_history')) {
    upsertScanHistory(params);
    return;
  }

  if (s.startsWith('insert or replace into emergency_contacts')) {
    upsertEmergencyContact(params);
    return;
  }

  if (s.startsWith('update profiles')) {
    updateProfile(s, params);
    return;
  }

  if (s.startsWith('delete from diary_entries where profileid')) {
    deleteDiaryEntriesByProfileId(params);
    return;
  }

  if (s.startsWith('delete from diary_entries where id')) {
    deleteDiaryEntryById(s, params);
    return;
  }

  if (s.startsWith('update diary_entries')) {
    updateDiaryEntry(s, params);
    return;
  }

  if (s.startsWith('delete from scan_history where profileid')) {
    deleteScanHistoryByProfileId(params);
    return;
  }

  if (s.startsWith('insert into scan_history')) {
    insertScanHistory(params);
    return;
  }

  if (s.startsWith('insert or replace into profile_sos')) {
    upsertProfileSos(params);
    return;
  }

  if (s.startsWith('delete from emergency_contacts where profileid =')) {
    deleteEmergencyContactsByProfileId(params);
    return;
  }

  if (s.startsWith('delete from emergency_contacts')) {
    deleteEmergencyContactById(params);
    return;
  }

  if (s.startsWith('delete from profiles')) {
    deleteProfile(s, params);
    return;
  }

  if (s.startsWith('insert into emergency_contacts')) {
    insertEmergencyContact(params);
    return;
  }

  if (s.startsWith('insert into safe_products')) {
    insertSafeProduct(params);
    return;
  }

  if (s.startsWith('delete from safe_products where id =') && s.includes('and profileid')) {
    deleteSafeProductByIdAndProfile(params);
    return;
  }

  if (s.startsWith('delete from safe_products where id =')) {
    deleteSafeProductById(params);
    return;
  }

  if (s.startsWith('insert into alias_feedback')) {
    insertAliasFeedback(params);
    return;
  }

  if (s.startsWith('delete from alias_feedback where id =')) {
    deleteAliasFeedbackById(params);
    return;
  }

  if (s === 'delete from alias_feedback' || s.startsWith('delete from alias_feedback;')) {
    deleteAllAliasFeedback();
    return;
  }

  if (s.startsWith('delete from safe_products where profileid =')) {
    deleteSafeProductsByProfileId(params);
    return;
  }

  if (s.startsWith('insert into diary_entries')) {
    insertDiaryEntry(params);
    return;
  }

  if (s.startsWith('insert into diary_attachments')) {
    insertDiaryAttachment(params);
    return;
  }

  if (s.startsWith('delete from diary_attachments where entryid =')) {
    deleteDiaryAttachmentsByEntryId(params);
    return;
  }

  if (s.startsWith('insert or replace into app_settings')) {
    upsertAppSetting(params);
    return;
  }

  if (s.startsWith('insert into users')) {
    insertUser(params);
    return;
  }

  if (s.startsWith('insert or replace into barcode_cache')) {
    upsertBarcodeCache(params);
    return;
  }

  warnUnmatched(sql);
}

export function routeGetFirstSync<T>(sql: string, params?: unknown[]): T | null {
  const s = normalizeSql(sql);

  if (s.includes('from app_settings') && s.includes('where key =')) {
    return getAppSettingByKey<T>(params);
  }

  if (s.includes('from users') && s.includes('where login =')) {
    return getUserByLogin<T>(params);
  }

  if (s.includes('from users') && s.includes('where id =')) {
    return getUserById<T>(params);
  }

  if (s.includes('from profiles') && s.includes('order by id desc limit 1')) {
    return getLatestProfile<T>(s, params);
  }

  if (s.includes('from profiles') && s.includes('where id =')) {
    return getProfileById<T>(s, params);
  }

  if (s.includes('from profile_sos')) {
    return getProfileSosNotes<T>(params);
  }

  if (s.includes('from diary_entries') && s.includes('where profileid =') && s.includes('and type =')) {
    return getDiaryEntryByProfileTypeAndCreatedAt<T>(params);
  }

  if (s.includes('from diary_entries') && s.includes('where profileid =')) {
    return getDiaryEntryByProfileId<T>(params);
  }

  if (s.includes('from diary_entries') && s.includes('where id =')) {
    return getDiaryEntryById<T>(params);
  }

  if (s.includes('from barcode_cache') && s.includes('where barcode =')) {
    return getBarcodeCacheByBarcode<T>(params);
  }

  if (s.includes('from barcode_cache') && s.includes('count(*)')) {
    return countBarcodeCache<T>();
  }

  warnUnmatched(sql);
  return null;
}

export function routeGetAllSync<T>(sql: string, params?: unknown[]): T[] {
  const s = normalizeSql(sql);

  if (s.includes('from profiles') && s.includes('where userid =')) {
    return listProfilesByUserId<T>(params);
  }

  if (s.includes('from profiles')) {
    return listProfiles<T>();
  }

  if (s.includes('from diary_attachments') && s.includes('where entryid in')) {
    return listDiaryAttachmentsByEntryIds<T>(params);
  }

  if (s.includes('from diary_attachments') && s.includes('where entryid =')) {
    return listDiaryAttachmentsByEntryId<T>(params);
  }

  if (s.includes('from diary_entries') && s.includes('where profileid =')) {
    return listDiaryEntriesByProfileId<T>(params);
  }

  if (s.includes('from scan_history') && s.includes('where profileid =')) {
    return listScanHistoryByProfileId<T>(params);
  }

  if (s.includes('from emergency_contacts') && s.includes('where profileid =')) {
    return listEmergencyContactsByProfileId<T>(params);
  }

  if (s.includes('from safe_products') && s.includes('where profileid =')) {
    return listSafeProductsByProfileId<T>(params);
  }

  if (s.includes('from alias_feedback') && s.includes("where status = 'pending'")) {
    return listPendingAliasFeedback<T>();
  }

  if (s.includes('from alias_feedback')) {
    return listAliasFeedback<T>();
  }

  if (s.includes('from app_settings')) {
    return listAppSettings<T>();
  }

  if (s.includes('from diary_entries')) {
    return listDiaryEntries<T>();
  }

  warnUnmatched(sql);
  return [];
}
