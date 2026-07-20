import {
  DEFAULT_POLLEN_REMINDER_HOUR,
  DEFAULT_POLLEN_REMINDER_MINUTE,
  DEFAULT_QUIET_HOURS_END,
  DEFAULT_QUIET_HOURS_START,
  collectPollenReminderTrigger,
  evaluatePollenAlert,
  type PollenMatchLike,
} from '@allerguide/core';
import { getPollenReminderNotificationContent } from '@/src/services/notification-content-service';
import {
  cancelPollenReminder,
  getPollenReminderHour,
  getPollenReminderMinute,
  getPollenReminderThreshold,
  isPollenReminderEnabled,
  isQuietHoursEnabled,
  requestNotificationPermission,
  scheduleDateNotification,
  setPollenReminderId,
} from '@/src/services/notification-service';
import { getSetting, setSetting } from '@/src/services/settings-service';
import { getProfileCapabilities } from '@/src/services/profile-capabilities-service';
import { listProfiles } from '@/src/services/profile-service';
import { trackEvent } from '@/src/services/analytics-service';
import { logCaughtError } from '@/src/services/error-reporting';
import { Platform } from 'react-native';

function pollenCacheKey(profileId: number) {
  return `pollenAlertCache:${profileId}`;
}

function readPollenCache(profileId: number): PollenMatchLike[] | null {
  const raw = getSetting(pollenCacheKey(profileId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { matches?: PollenMatchLike[] };
    return Array.isArray(parsed.matches) ? parsed.matches : null;
  } catch (error) {
    logCaughtError('readPollenCache', error, { level: 'warn', extra: { profileId: String(profileId) } });
    return null;
  }
}

function writePollenCache(profileId: number, matches: PollenMatchLike[]) {
  setSetting(
    pollenCacheKey(profileId),
    JSON.stringify({ checkedAt: new Date().toISOString(), matches }),
  );
}

export async function syncPollenReminderForProfile(
  profileId: number,
  profileName: string,
  matches: PollenMatchLike[],
  envDataAvailable: boolean,
): Promise<void> {
  if (Platform.OS === 'web') return;

  writePollenCache(profileId, matches);

  if (!isPollenReminderEnabled() || !envDataAvailable) {
    await cancelPollenReminder(profileId);
    return;
  }

  const threshold = getPollenReminderThreshold();
  const evaluation = evaluatePollenAlert(matches, threshold);
  const quietHours = isQuietHoursEnabled()
    ? { start: DEFAULT_QUIET_HOURS_START, end: DEFAULT_QUIET_HOURS_END }
    : undefined;
  const trigger = collectPollenReminderTrigger(
    profileId,
    evaluation,
    getPollenReminderHour(),
    getPollenReminderMinute(),
    new Date(),
    quietHours,
  );

  await cancelPollenReminder(profileId);
  if (!trigger) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const level = trigger.pollenLevel === 'high' ? 'high' : 'moderate';
  const content = getPollenReminderNotificationContent(
    profileName,
    trigger.pollenLabel ?? '',
    level,
  );
  const id = await scheduleDateNotification(trigger.at, content, {
    type: 'pollen',
    profileId,
  });
  if (id) {
    setPollenReminderId(profileId, id);
    trackEvent('pollen_alert_sent', { profileId, level });
  }
}

export async function reconcilePollenReminders(): Promise<void> {
  if (Platform.OS === 'web' || !isPollenReminderEnabled()) return;

  const profiles = listProfiles();
  for (const profile of profiles) {
    const capabilities = getProfileCapabilities(profile);
    if (!capabilities.reminders.pollen) {
      await cancelPollenReminder(profile.id);
      continue;
    }
    const matches = readPollenCache(profile.id);
    if (!matches) continue;
    await syncPollenReminderForProfile(profile.id, profile.name, matches, true);
  }
}

export function getDefaultPollenReminderTime() {
  return { hour: DEFAULT_POLLEN_REMINDER_HOUR, minute: DEFAULT_POLLEN_REMINDER_MINUTE };
}
