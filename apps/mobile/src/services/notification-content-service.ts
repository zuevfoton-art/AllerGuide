import { DEFAULT_LOCALE } from '@/src/i18n/types';
import { LOCALE_MESSAGES } from '@/src/i18n/locales';
import { formatMessage, translate } from '@/src/i18n/translate';
import type { AsitCourse } from '@allerguide/core';
import { getLocale } from '@/src/services/settings-service';

function resolveLocale() {
  return getLocale() ?? DEFAULT_LOCALE;
}

export function getDiaryReminderNotificationContent(): { title: string; body: string } {
  const messages = LOCALE_MESSAGES[resolveLocale()];
  return {
    title: translate(messages, 'notifications.diaryPushTitle'),
    body: translate(messages, 'notifications.diaryPushBody'),
  };
}

export function getAsitReminderNotificationContent(course: AsitCourse): { title: string; body: string } {
  const messages = LOCALE_MESSAGES[resolveLocale()];
  const drug = course.drug.trim() || translate(messages, 'notifications.asitDrugFallback');
  const allergen = course.allergen.trim() || translate(messages, 'notifications.asitAllergenFallback');
  return {
    title: translate(messages, 'notifications.asitPushTitle'),
    body: formatMessage(translate(messages, 'notifications.asitPushBody'), { drug, allergen }),
  };
}

export function getActReminderNotificationContent(): { title: string; body: string } {
  const messages = LOCALE_MESSAGES[resolveLocale()];
  return {
    title: translate(messages, 'notifications.actPushTitle'),
    body: translate(messages, 'notifications.actPushBody'),
  };
}

export function getDoctorVisitReminderNotificationContent(visitLabel: string): { title: string; body: string } {
  const messages = LOCALE_MESSAGES[resolveLocale()];
  return {
    title: translate(messages, 'notifications.visitPushTitle'),
    body: formatMessage(translate(messages, 'notifications.visitPushBody'), { visit: visitLabel }),
  };
}

export function getEpinephrineExpiryNotificationContent(): { title: string; body: string } {
  const messages = LOCALE_MESSAGES[resolveLocale()];
  return {
    title: translate(messages, 'notifications.epiPushTitle'),
    body: translate(messages, 'notifications.epiPushBody'),
  };
}
