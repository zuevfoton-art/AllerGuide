import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import {
  DEFAULT_DIARY_REMINDER_HOUR,
  DEFAULT_DIARY_REMINDER_MINUTE,
  DEFAULT_QUIET_HOURS_END,
  DEFAULT_QUIET_HOURS_START,
  DIARY_REMINDER_HOUR_KEY,
  DIARY_REMINDER_MINUTE_KEY,
  clampReminderHour,
  clampReminderMinute,
  computeNextDiaryReminderAt,
  parseReminderHour,
  parseReminderMinute,
  type DiaryEntryLike,
  type ReminderNotificationContent,
} from '@allerguide/core';
import { getSetting, setSetting } from '@/src/services/settings-service';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const REMINDER_ID_KEY = 'diaryReminderId';
const REMINDER_ENABLED_KEY = 'diaryReminderEnabled';
const ACT_REMINDER_ENABLED_KEY = 'actReminderEnabled';
const VISIT_REMINDER_ENABLED_KEY = 'visitReminderEnabled';
const EPI_REMINDER_ENABLED_KEY = 'epinephrineReminderEnabled';
const QUIET_HOURS_ENABLED_KEY = 'quietHoursEnabled';
const CLINICAL_REMINDER_IDS_KEY = 'clinicalReminderIds';
const POLLEN_REMINDER_ENABLED_KEY = 'pollenReminderEnabled';
const POLLEN_REMINDER_HOUR_KEY = 'pollenReminderHour';
const POLLEN_REMINDER_MINUTE_KEY = 'pollenReminderMinute';
const POLLEN_REMINDER_THRESHOLD_KEY = 'pollenReminderThreshold';

function pollenReminderIdKey(profileId: number) {
  return `pollenReminderId:${profileId}`;
}

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'web-unavailable';

export type NotificationPayload = {
  type: string;
  profileId?: number;
  scaleId?: string;
  entryId?: number;
  visitLabel?: string;
};

function isNotificationGranted(
  permissions: Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>,
): boolean {
  const legacy = permissions as { granted?: boolean; status?: string };
  if (typeof legacy.granted === 'boolean') return legacy.granted;
  return legacy.status === 'granted';
}

function readClinicalReminderIds(): string[] {
  const raw = getSetting(CLINICAL_REMINDER_IDS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeClinicalReminderIds(ids: string[]) {
  setSetting(CLINICAL_REMINDER_IDS_KEY, JSON.stringify(ids));
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const existing = await Notifications.getPermissionsAsync();
  if (isNotificationGranted(existing)) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return isNotificationGranted(requested);
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === 'web') return 'web-unavailable';

  const permissions = await Notifications.getPermissionsAsync();
  if (isNotificationGranted(permissions)) return 'granted';

  const status = (permissions as { status?: string }).status;
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export function openNotificationSettings(): void {
  if (Platform.OS === 'web') return;
  void Linking.openSettings();
}

export function isDiaryReminderEnabled(): boolean {
  return getSetting(REMINDER_ENABLED_KEY) === 'true';
}

export function setDiaryReminderEnabled(enabled: boolean) {
  setSetting(REMINDER_ENABLED_KEY, enabled ? 'true' : 'false');
}

export function isActReminderEnabled(): boolean {
  return getSetting(ACT_REMINDER_ENABLED_KEY) === 'true';
}

export function setActReminderEnabled(enabled: boolean) {
  setSetting(ACT_REMINDER_ENABLED_KEY, enabled ? 'true' : 'false');
}

export function isVisitReminderEnabled(): boolean {
  return getSetting(VISIT_REMINDER_ENABLED_KEY) === 'true';
}

export function setVisitReminderEnabled(enabled: boolean) {
  setSetting(VISIT_REMINDER_ENABLED_KEY, enabled ? 'true' : 'false');
}

export function isEpinephrineReminderEnabled(): boolean {
  return getSetting(EPI_REMINDER_ENABLED_KEY) === 'true';
}

export function setEpinephrineReminderEnabled(enabled: boolean) {
  setSetting(EPI_REMINDER_ENABLED_KEY, enabled ? 'true' : 'false');
}

export function isQuietHoursEnabled(): boolean {
  return getSetting(QUIET_HOURS_ENABLED_KEY) !== 'false';
}

export function setQuietHoursEnabled(enabled: boolean) {
  setSetting(QUIET_HOURS_ENABLED_KEY, enabled ? 'true' : 'false');
}

export type PollenReminderThreshold = 'high' | 'moderate';

export function isPollenReminderEnabled(): boolean {
  return getSetting(POLLEN_REMINDER_ENABLED_KEY) === 'true';
}

export function setPollenReminderEnabled(enabled: boolean) {
  setSetting(POLLEN_REMINDER_ENABLED_KEY, enabled ? 'true' : 'false');
}

export function getPollenReminderHour(): number {
  const hour = parseInt(getSetting(POLLEN_REMINDER_HOUR_KEY) ?? '7', 10);
  return Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 7;
}

export function getPollenReminderMinute(): number {
  const minute = parseInt(getSetting(POLLEN_REMINDER_MINUTE_KEY) ?? '30', 10);
  return Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 30;
}

export function setPollenReminderTime(hour: number, minute: number) {
  setSetting(POLLEN_REMINDER_HOUR_KEY, String(Math.min(23, Math.max(0, hour))));
  setSetting(POLLEN_REMINDER_MINUTE_KEY, String(Math.min(59, Math.max(0, minute))));
}

export function getPollenReminderThreshold(): PollenReminderThreshold {
  const raw = getSetting(POLLEN_REMINDER_THRESHOLD_KEY) ?? 'high';
  return raw === 'moderate' ? 'moderate' : 'high';
}

export function setPollenReminderThreshold(threshold: PollenReminderThreshold) {
  setSetting(POLLEN_REMINDER_THRESHOLD_KEY, threshold);
}

export async function cancelPollenReminder(profileId: number): Promise<void> {
  if (Platform.OS === 'web') return;

  const existing = getSetting(pollenReminderIdKey(profileId));
  if (existing) {
    try {
      await Notifications.cancelScheduledNotificationAsync(existing);
    } catch {
      /* ignore */
    }
    setSetting(pollenReminderIdKey(profileId), '');
  }
}

export function setPollenReminderId(profileId: number, id: string) {
  setSetting(pollenReminderIdKey(profileId), id);
}

export function getDiaryReminderHour(): number {
  return parseReminderHour(getSetting(DIARY_REMINDER_HOUR_KEY), DEFAULT_DIARY_REMINDER_HOUR);
}

export function getDiaryReminderMinute(): number {
  return parseReminderMinute(getSetting(DIARY_REMINDER_MINUTE_KEY), DEFAULT_DIARY_REMINDER_MINUTE);
}

export function setDiaryReminderTime(hour: number, minute: number) {
  setSetting(DIARY_REMINDER_HOUR_KEY, String(clampReminderHour(hour)));
  setSetting(DIARY_REMINDER_MINUTE_KEY, String(clampReminderMinute(minute)));
}

async function cancelDiaryReminderSchedule() {
  if (Platform.OS === 'web') return;

  const existing = getSetting(REMINDER_ID_KEY);
  if (existing) {
    await Notifications.cancelScheduledNotificationAsync(existing);
    setSetting(REMINDER_ID_KEY, '');
  }
}

export async function cancelAllClinicalReminders() {
  if (Platform.OS === 'web') return;

  const ids = readClinicalReminderIds();
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  writeClinicalReminderIds([]);
}

export async function cancelDiaryReminder() {
  await cancelDiaryReminderSchedule();
  setDiaryReminderEnabled(false);
}

export async function scheduleDateNotification(
  at: Date,
  content: ReminderNotificationContent,
  data: NotificationPayload,
): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (at.getTime() <= Date.now()) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      data,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: at,
    },
  });
}

export async function scheduleDiaryReminder(
  content: ReminderNotificationContent,
  entries: DiaryEntryLike[],
): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  await cancelDiaryReminderSchedule();

  const quietHours = isQuietHoursEnabled()
    ? { start: DEFAULT_QUIET_HOURS_START, end: DEFAULT_QUIET_HOURS_END }
    : undefined;
  const at = computeNextDiaryReminderAt(
    entries,
    getDiaryReminderHour(),
    getDiaryReminderMinute(),
    new Date(),
    quietHours,
  );

  const id = await scheduleDateNotification(at, content, { type: 'diary' });
  if (!id) return false;

  setSetting(REMINDER_ID_KEY, id);
  setDiaryReminderEnabled(true);
  return true;
}

export async function syncDiaryReminder(
  enabled: boolean,
  content: ReminderNotificationContent,
  entries: DiaryEntryLike[],
): Promise<boolean> {
  if (!enabled) {
    await cancelDiaryReminder();
    return true;
  }
  return scheduleDiaryReminder(content, entries);
}

export async function rescheduleDiaryReminderIfEnabled(
  content: ReminderNotificationContent,
  entries: DiaryEntryLike[],
): Promise<void> {
  if (Platform.OS === 'web' || !isDiaryReminderEnabled()) return;

  const status = await getNotificationPermissionStatus();
  if (status !== 'granted') return;

  await scheduleDiaryReminder(content, entries);
}

export async function appendClinicalReminderIds(ids: string[]) {
  if (ids.length === 0) return;
  writeClinicalReminderIds([...readClinicalReminderIds(), ...ids]);
}

export async function sendDiaryReminderPreview(content: ReminderNotificationContent): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      data: { type: 'diary' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
    },
  });

  return true;
}
