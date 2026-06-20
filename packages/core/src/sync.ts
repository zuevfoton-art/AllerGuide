import type { DiaryEntry, Profile } from './types';
import type { EmergencyContact } from './emergency-contacts';

export interface SyncPayload {
  v: 1;
  exportedAt: string;
  userId: number;
  profiles: Profile[];
  diaryEntries: DiaryEntry[];
  emergencyContacts: EmergencyContact[];
}

export function createSyncPayload(input: {
  userId: number;
  profiles: Profile[];
  diaryEntries: DiaryEntry[];
  emergencyContacts: EmergencyContact[];
}): SyncPayload {
  return {
    v: 1,
    exportedAt: new Date().toISOString(),
    userId: input.userId,
    profiles: input.profiles,
    diaryEntries: input.diaryEntries,
    emergencyContacts: input.emergencyContacts,
  };
}

export function parseSyncPayload(raw: string): SyncPayload | null {
  try {
    const parsed = JSON.parse(raw) as SyncPayload;
    if (parsed?.v !== 1 || !Array.isArray(parsed.profiles)) return null;
    return parsed;
  } catch {
    return null;
  }
}
