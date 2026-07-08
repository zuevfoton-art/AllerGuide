import type { DiaryEntry, Profile, ScanHistoryEntry } from './types';
import type { EmergencyContact } from './emergency-contacts';

export interface ProfileSosEntry {
  profileId: number;
  notes: string;
}

export interface SyncPayload {
  v: 1 | 2;
  exportedAt: string;
  userId: number;
  profiles: Profile[];
  diaryEntries: DiaryEntry[];
  emergencyContacts: EmergencyContact[];
  scanHistory?: ScanHistoryEntry[];
  profileSos?: ProfileSosEntry[];
  appSettings?: Record<string, string>;
}

export function createSyncPayload(input: {
  userId: number;
  profiles: Profile[];
  diaryEntries: DiaryEntry[];
  emergencyContacts: EmergencyContact[];
  scanHistory?: ScanHistoryEntry[];
  profileSos?: ProfileSosEntry[];
  appSettings?: Record<string, string>;
}): SyncPayload {
  return {
    v: 2,
    exportedAt: new Date().toISOString(),
    userId: input.userId,
    profiles: input.profiles,
    diaryEntries: input.diaryEntries,
    emergencyContacts: input.emergencyContacts,
    scanHistory: input.scanHistory ?? [],
    profileSos: input.profileSos ?? [],
    appSettings: input.appSettings ?? {},
  };
}

export function parseSyncPayload(raw: string): SyncPayload | null {
  try {
    const parsed = JSON.parse(raw) as SyncPayload;
    if ((parsed?.v !== 1 && parsed?.v !== 2) || !Array.isArray(parsed.profiles)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function validateSyncPayload(payload: SyncPayload, expectedUserId: number): string | null {
  if (payload.userId !== expectedUserId) return 'User mismatch';
  if (!Array.isArray(payload.profiles)) return 'Invalid profiles';
  if (!Array.isArray(payload.diaryEntries)) return 'Invalid diary entries';
  if (!Array.isArray(payload.emergencyContacts)) return 'Invalid emergency contacts';
  return null;
}

export const USER_SCOPED_SETTING_KEYS = [
  'authUserId',
  'scenario',
  'onboardingComplete',
  'themeMode',
  'emergencyNumber',
] as const;

/** Reminder preferences synced in backup (not OS notification IDs). */
export const REMINDER_SETTING_KEYS = [
  'diaryReminderEnabled',
  'diaryReminderHour',
  'diaryReminderMinute',
  'actReminderEnabled',
  'visitReminderEnabled',
  'epinephrineReminderEnabled',
  'quietHoursEnabled',
  'pollenReminderEnabled',
  'pollenReminderHour',
  'pollenReminderMinute',
  'pollenReminderThreshold',
] as const;

export const REMINDER_CACHE_PREFIXES = ['pollenAlertCache:'] as const;

export function isReminderSettingKey(key: string): boolean {
  if ((REMINDER_SETTING_KEYS as readonly string[]).includes(key)) return true;
  return REMINDER_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export const PROFILE_SCOPED_SETTING_PREFIXES = [
  'conditionHistory:',
  'profileConditions:',
  'sosPassport:',
  'sosPlan:',
] as const;

export function filterUserScopedSettings(settings: Record<string, string>): Record<string, string> {
  const filtered: Record<string, string> = {};
  for (const key of USER_SCOPED_SETTING_KEYS) {
    if (settings[key] != null) filtered[key] = settings[key];
  }
  for (const key of REMINDER_SETTING_KEYS) {
    if (settings[key] != null) filtered[key] = settings[key];
  }
  for (const [key, value] of Object.entries(settings)) {
    if (PROFILE_SCOPED_SETTING_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      filtered[key] = value;
    }
    if (REMINDER_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      filtered[key] = value;
    }
  }
  return filtered;
}
