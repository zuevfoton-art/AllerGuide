import { createSyncPayload, parseSyncPayload } from '@allerguide/core';
import { getCurrentUserId } from '@/src/services/auth-service';
import { listProfiles } from '@/src/services/profile-service';
import { getDb } from '@/src/db/init';
import type { DiaryEntry, EmergencyContact } from '@allerguide/core';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

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

  return createSyncPayload({
    userId,
    profiles,
    diaryEntries,
    emergencyContacts,
  });
}

export function exportLocalBackup(): string {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User is not authenticated');
  return JSON.stringify(collectUserData(userId));
}

export async function uploadBackup(): Promise<{ ok: boolean; error?: string }> {
  const userId = getCurrentUserId();
  if (!userId) return { ok: false, error: 'Не выполнен вход' };

  try {
    const response = await fetch(`${API_BASE}/api/sync/backup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collectUserData(userId)),
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
  const userId = getCurrentUserId();
  if (!userId) return { ok: false, error: 'Не выполнен вход' };

  try {
    const response = await fetch(`${API_BASE}/api/sync/backup/${userId}`);
    if (!response.ok) return { ok: false, error: 'Резервная копия не найдена' };

    const payload = parseSyncPayload(await response.text());
    if (!payload || payload.userId !== userId) {
      return { ok: false, error: 'Некорректные данные резервной копии' };
    }

    const db = getDb();
    for (const profile of payload.profiles) {
      db.runSync(
        'INSERT OR REPLACE INTO profiles (id, userId, name, birthYear, type, allergies) VALUES (?, ?, ?, ?, ?, ?)',
        [profile.id, userId, profile.name, profile.birthYear, profile.type, profile.allergies],
      );
    }

    return { ok: true };
  } catch {
    return { ok: false, error: 'Не удалось загрузить резервную копию' };
  }
}
