import {
  createSyncPayload,
  filterUserScopedSettings,
  parseSyncPayload,
  validateSyncPayload,
  type DiaryEntry,
  type EmergencyContact,
  type ScanHistoryEntry,
} from '@allerguide/core';
import { getCurrentUserId } from '@/src/services/auth-service';
import { getAuthToken } from '@/src/services/backend-api';
import { decryptBackup, encryptBackup } from '@/src/services/backup-crypto';
import { listProfiles } from '@/src/services/profile-service';
import { getSosNotes } from '@/src/services/sos-service';
import { getDb } from '@/src/db/init';
import { applySyncPayload } from '@/src/services/sync-restore';
import { reconcileAllReminders } from '@/src/services/reminder-reconcile-service';
import { CLOUD_SYNC_ENABLED } from '@/src/constants/features';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

function collectAppSettings(): Record<string, string> {
  const db = getDb();
  const rows = db.getAllSync<{ key: string; value: string }>('SELECT key, value FROM app_settings');
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return filterUserScopedSettings(settings);
}

function collectUserData(userId: number) {
  const profiles = listProfiles();
  const profileIds = profiles.map((profile) => profile.id);
  const db = getDb();

  const diaryEntries = db
    .getAllSync<DiaryEntry>('SELECT * FROM diary_entries')
    .filter((entry) => profileIds.includes(entry.profileId));

  const emergencyContacts = profileIds.flatMap((profileId) =>
    db.getAllSync<EmergencyContact>(
      'SELECT * FROM emergency_contacts WHERE profileId = ?',
      [profileId],
    ),
  );

  const scanHistory = profileIds.flatMap((profileId) =>
    db.getAllSync<ScanHistoryEntry>(
      'SELECT * FROM scan_history WHERE profileId = ?',
      [profileId],
    ),
  );

  const profileSos = profileIds
    .map((profileId) => ({ profileId, notes: getSosNotes(profileId) }))
    .filter((entry) => entry.notes.length > 0);

  return createSyncPayload({
    userId,
    profiles,
    diaryEntries,
    emergencyContacts,
    scanHistory,
    profileSos,
    appSettings: collectAppSettings(),
  });
}

export function exportLocalBackup(): string {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User is not authenticated');
  return JSON.stringify(collectUserData(userId));
}

export function importLocalBackup(raw: string): { ok: true } | { ok: false; error: string } {
  const userId = getCurrentUserId();
  if (!userId) return { ok: false, error: 'Не выполнен вход' };

  const payload = parseSyncPayload(raw);
  if (!payload) return { ok: false, error: 'Некорректный файл резервной копии' };

  const validationError = validateSyncPayload(payload, userId);
  if (validationError) return { ok: false, error: 'Файл резервной копии не подходит для этого аккаунта' };

  applySyncPayload(getDb(), payload, userId);
  void reconcileAllReminders();
  return { ok: true };
}

export async function uploadBackup(): Promise<{ ok: boolean; error?: string }> {
  if (!CLOUD_SYNC_ENABLED) {
    return { ok: false, error: 'Облачная синхронизация пока недоступна' };
  }

  const userId = getCurrentUserId();
  if (!userId) return { ok: false, error: 'Не выполнен вход' };

  try {
    const payload = collectUserData(userId);
    const token = await getAuthToken();
    const envelope = await encryptBackup(JSON.stringify(payload));

    // Prefer zero-knowledge encrypted upload; fall back to plaintext over TLS
    // when the platform lacks Web Crypto (e.g. RN without a polyfill).
    const body = envelope
      ? { v: 2 as const, userId, exportedAt: payload.exportedAt, encrypted: true, payload: envelope }
      : payload;

    const response = await fetch(`${API_BASE}/api/sync/backup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return { ok: false, error: 'Сервер недоступен' };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: 'Не удалось подключиться к серверу' };
  }
}

export async function downloadBackup(): Promise<{ ok: boolean; error?: string }> {
  if (!CLOUD_SYNC_ENABLED) {
    return { ok: false, error: 'Облачная синхронизация пока недоступна' };
  }

  const userId = getCurrentUserId();
  if (!userId) return { ok: false, error: 'Не выполнен вход' };

  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/sync/backup/${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) return { ok: false, error: 'Резервная копия не найдена' };

    let raw = await response.text();
    const outer = JSON.parse(raw) as { encrypted?: boolean; payload?: string };
    if (outer?.encrypted && typeof outer.payload === 'string') {
      const decrypted = await decryptBackup(outer.payload);
      if (!decrypted) return { ok: false, error: 'Не удалось расшифровать резервную копию' };
      raw = decrypted;
    }

    const payload = parseSyncPayload(raw);
    if (!payload) return { ok: false, error: 'Некорректные данные резервной копии' };

    const validationError = validateSyncPayload(payload, userId);
    if (validationError) return { ok: false, error: 'Резервная копия не подходит для этого аккаунта' };

    applySyncPayload(getDb(), payload, userId);
    void reconcileAllReminders();
    return { ok: true };
  } catch {
    return { ok: false, error: 'Не удалось загрузить резервную копию' };
  }
}
