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
import {
  decryptBackup,
  encryptBackup,
  hasRecoveryKey,
  markRecoveryKeyConfirmed,
  setRecoveryKey,
} from '@/src/services/backup-crypto';
import { listProfiles } from '@/src/services/profile-service';
import { getSosNotes } from '@/src/services/sos-service';
import { getDb } from '@/src/db/init';
import { applySyncPayload } from '@/src/services/sync-restore';
import { reconcileAllReminders } from '@/src/services/reminder-reconcile-service';
import { trackEvent } from '@/src/services/analytics-service';
import { logCaughtError } from '@/src/services/error-reporting';
import { CLOUD_SYNC_ENABLED } from '@/src/constants/features';
import { fetchWithTimeout } from '@/src/utils/fetch-with-timeout';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
/** Backup upload/download must not hang settings on a dead network. */
const SYNC_TIMEOUT_MS = 15_000;
const SYNC_RETRY_DELAY_MS = 400;

function isRetryableSyncStatus(status: number): boolean {
  return status === 502 || status === 503;
}

async function fetchSyncWithRetry(url: string, init: RequestInit & { timeoutMs?: number }): Promise<Response> {
  try {
    const response = await fetchWithTimeout(url, init);
    if (!isRetryableSyncStatus(response.status)) return response;
    await new Promise((resolve) => setTimeout(resolve, SYNC_RETRY_DELAY_MS));
    return fetchWithTimeout(url, init);
  } catch {
    await new Promise((resolve) => setTimeout(resolve, SYNC_RETRY_DELAY_MS));
    return fetchWithTimeout(url, init);
  }
}

export type SyncErrorCode =
  | 'sync_disabled'
  | 'not_authenticated'
  | 'server_unreachable'
  | 'backup_not_found'
  | 'decrypt_failed'
  | 'wrong_recovery_key'
  | 'recovery_key_required'
  | 'encryption_unavailable'
  | 'invalid_payload'
  | 'wrong_account'
  | 'encryption_unavailable';

export type SyncResult = { ok: true } | { ok: false; error: string; code: SyncErrorCode };

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

export async function uploadBackup(): Promise<SyncResult> {
  if (!CLOUD_SYNC_ENABLED) {
    return { ok: false, error: 'Облачная синхронизация пока недоступна', code: 'sync_disabled' };
  }

  const userId = getCurrentUserId();
  if (!userId) return { ok: false, error: 'Не выполнен вход', code: 'not_authenticated' };

  try {
    const payload = collectUserData(userId);
    const token = await getAuthToken();
    const envelope = await encryptBackup(JSON.stringify(payload));
    if (!envelope) {
      return {
        ok: false,
        error: 'Не удалось зашифровать резервную копию',
        code: 'encryption_unavailable',
      };
    }

    const body = {
      v: 2 as const,
      userId,
      exportedAt: payload.exportedAt,
      encrypted: true,
      payload: envelope,
    };

    const response = await fetchSyncWithRetry(`${API_BASE}/api/sync/backup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      timeoutMs: SYNC_TIMEOUT_MS,
    });

    if (!response.ok) {
      if (response.status === 503) {
        return { ok: false, error: 'Облачная синхронизация пока недоступна', code: 'sync_disabled' };
      }
      return { ok: false, error: 'Сервер недоступен', code: 'server_unreachable' };
    }

    trackEvent('sync_upload');
    return { ok: true };
  } catch (error) {
    logCaughtError('uploadBackup', error);
    return { ok: false, error: 'Не удалось подключиться к серверу', code: 'server_unreachable' };
  }
}

export async function downloadBackup(options?: {
  recoveryKey?: string;
}): Promise<SyncResult> {
  if (!CLOUD_SYNC_ENABLED) {
    return { ok: false, error: 'Облачная синхронизация пока недоступна', code: 'sync_disabled' };
  }

  const userId = getCurrentUserId();
  if (!userId) return { ok: false, error: 'Не выполнен вход', code: 'not_authenticated' };

  const recoveryKey = options?.recoveryKey?.trim();
  if (!hasRecoveryKey() && !recoveryKey) {
    return {
      ok: false,
      error: 'Введите ключ восстановления с другого устройства',
      code: 'recovery_key_required',
    };
  }

  try {
    const token = await getAuthToken();
    const response = await fetchSyncWithRetry(`${API_BASE}/api/sync/backup/${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeoutMs: SYNC_TIMEOUT_MS,
    });
    if (!response.ok) {
      if (response.status === 503) {
        return { ok: false, error: 'Облачная синхронизация пока недоступна', code: 'sync_disabled' };
      }
      return { ok: false, error: 'Резервная копия не найдена', code: 'backup_not_found' };
    }

    let raw = await response.text();
    const outer = JSON.parse(raw) as { encrypted?: boolean; payload?: string };
    if (outer?.encrypted && typeof outer.payload === 'string') {
      const passphrase = recoveryKey ?? undefined;
      const decrypted = await decryptBackup(outer.payload, passphrase ? { passphrase } : undefined);
      if (!decrypted) {
        if (recoveryKey) {
          return { ok: false, error: 'Неверный ключ восстановления', code: 'wrong_recovery_key' };
        }
        return {
          ok: false,
          error: 'Не удалось расшифровать резервную копию',
          code: 'recovery_key_required',
        };
      }
      raw = decrypted;
    }

    const payload = parseSyncPayload(raw);
    if (!payload) {
      return { ok: false, error: 'Некорректные данные резервной копии', code: 'invalid_payload' };
    }

    const validationError = validateSyncPayload(payload, userId);
    if (validationError) {
      return {
        ok: false,
        error: 'Резервная копия не подходит для этого аккаунта',
        code: 'wrong_account',
      };
    }

    if (recoveryKey) {
      const stored = setRecoveryKey(recoveryKey);
      if (!stored.ok) {
        return { ok: false, error: 'Некорректный ключ восстановления', code: 'wrong_recovery_key' };
      }
      markRecoveryKeyConfirmed();
    }

    applySyncPayload(getDb(), payload, userId);
    void reconcileAllReminders();
    trackEvent('sync_download');
    return { ok: true };
  } catch (error) {
    logCaughtError('downloadBackup', error);
    return { ok: false, error: 'Не удалось загрузить резервную копию', code: 'server_unreachable' };
  }
}
