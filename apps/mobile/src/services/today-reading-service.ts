import {
  buildDailyReading,
  hasDiaryEntryOnDate,
  type DailyReadingActionId,
  type DailyReadingTone,
  type DiaryEntry,
  type Profile,
} from '@allerguide/core';
import type { WellnessSnapshot } from '@/src/services/wellness-service';

export type TodayReadingAction = {
  id: DailyReadingActionId;
  label: string;
  href: string;
};

export type TodayReading = {
  tone: DailyReadingTone;
  title: string;
  lead: string;
  advice: string;
  action: TodayReadingAction;
};

type Translate = (key: string, params?: Record<string, string | number>) => string;

const ACTION_HREF: Record<DailyReadingActionId, string> = {
  'create-profile': '/profile-setup?mode=add',
  'open-map': '/(tabs)/map',
  'open-journal': '/(tabs)/diary',
  'open-scanner': '/(tabs)/scanner',
};

const ACTION_LABEL_KEY: Record<DailyReadingActionId, string> = {
  'create-profile': 'today.action.createProfile',
  'open-map': 'today.action.openMap',
  'open-journal': 'today.action.openJournal',
  'open-scanner': 'today.action.openScanner',
};

/** Localizes the core daily reading for the Today tab (north-star N2). */
export function buildTodayReading(input: {
  profile: Profile | null;
  wellness: WellnessSnapshot | null;
  t: Translate;
}): TodayReading {
  const { wellness, t } = input;
  const reading = buildDailyReading({
    hasProfile: Boolean(input.profile),
    envDataAvailable: Boolean(wellness?.envDataAvailable),
    pollenTier: wellness?.display.pollenTier ?? 'unknown',
    airTier: wellness?.display.airTier ?? 'unknown',
    diaryTier: wellness?.display.diaryTier ?? 'unknown',
    pollenAllergenLabel: wellness?.display.pollenAllergenLabel ?? null,
  });

  const lead = reading.allergenLabel
    ? `${t(`today.lead.${reading.leadId}`)} ${t('today.leadAllergen', { allergen: reading.allergenLabel })}`
    : t(`today.lead.${reading.leadId}`);

  return {
    tone: reading.tone,
    title: t('today.readingTitle'),
    lead,
    advice: t(`today.advice.${reading.adviceId}`),
    action: {
      id: reading.action,
      label: t(ACTION_LABEL_KEY[reading.action]),
      href: ACTION_HREF[reading.action],
    },
  };
}

export function hasCheckedInToday(entries: DiaryEntry[], now = new Date()): boolean {
  return hasDiaryEntryOnDate(entries, now, now);
}

/** Locale-aware «Wednesday, 9 September» eyebrow above the Today title. */
export function formatTodayDate(locale: string, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(now);
  } catch {
    return now.toDateString();
  }
}
