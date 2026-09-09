import {
  computeNextPrescribedIntake,
  formatPrescribedReminderTime,
  isPrescribedCourseConfigured,
  planHomeInsights,
  type DiaryEntry,
  type PlannedHomeInsightKind,
  type PrescribedCourse,
  type Profile,
  type ReturnStage,
} from '@allerguide/core';
import { getStoredProfileConditions } from '@/src/services/profile-conditions-service';
import { getProfileCapabilities } from '@/src/services/profile-capabilities-service';
import type { WellnessSnapshot } from '@/src/services/wellness-service';
import { getDiaryEntries } from '@/src/services/diary-service';

export type HomeInsightAction = {
  label: string;
  href: string;
};

export type HomeInsightItem = {
  id: string;
  kind: PlannedHomeInsightKind;
  icon: string;
  title: string;
  text: string;
  action?: HomeInsightAction;
  extraAction?: HomeInsightAction;
};

type Translate = (key: string, params?: Record<string, string | number>) => string;

function filterWellnessRecommendations(
  wellness: WellnessSnapshot | null,
  pollenRemindersEnabled: boolean,
) {
  const recommendations = wellness?.recommendations ?? [];
  if (pollenRemindersEnabled) return recommendations;
  return recommendations.filter((rec) => rec.icon !== '🌿' && rec.icon !== '📅');
}

export function buildHomeInsightItems(input: {
  profile: Profile | null;
  diaryEntries: DiaryEntry[];
  wellness: WellnessSnapshot | null;
  phenotypeHints: string[];
  prescribedCourse?: PrescribedCourse | null;
  returnStage?: ReturnStage | null;
  t: Translate;
}): HomeInsightItem[] {
  const capabilities = input.profile ? getProfileCapabilities(input.profile) : null;
  const conditions = input.profile ? getStoredProfileConditions(input.profile.id) : [];
  const wellnessRecs = filterWellnessRecommendations(
    input.wellness,
    Boolean(capabilities?.reminders.pollen),
  );

  const nextIntake =
    input.prescribedCourse && isPrescribedCourseConfigured(input.prescribedCourse)
      ? computeNextPrescribedIntake(input.prescribedCourse)
      : null;

  const planned = planHomeInsights({
    hasProfile: Boolean(input.profile),
    diaryEntries: input.diaryEntries,
    conditions,
    enableActReminder: Boolean(capabilities?.reminders.act),
    wellnessCount: wellnessRecs.length,
    phenotypeCount: input.phenotypeHints.length,
    hasTherapyReminder: Boolean(
      input.prescribedCourse && isPrescribedCourseConfigured(input.prescribedCourse),
    ),
    returnStage: input.returnStage,
  });

  const items: HomeInsightItem[] = [];

  for (const item of planned) {
    if (item.kind === 'select-profile') {
      items.push({
        id: item.id,
        kind: item.kind,
        icon: 'person-outline',
        title: input.t('home.insightsSelectProfileTitle'),
        text: input.t('home.insightsSelectProfileText'),
        action: {
          label: input.t('home.insightsOpenProfiles'),
          href: '/profile',
        },
      });
      continue;
    }

    if (item.kind === 'diary-missing-today') {
      items.push({
        id: item.id,
        kind: item.kind,
        icon: 'create-outline',
        title: input.t('home.insightsDiaryTitle'),
        text: input.t('home.insightsDiaryText'),
        action: {
          label: input.t('home.insightsOpenDiary'),
          href: '/(tabs)/diary',
        },
      });
      continue;
    }

    if (item.kind === 'return-quick-checkin') {
      items.push({
        id: item.id,
        kind: item.kind,
        icon: 'heart-outline',
        title: input.t('reengagement.checkInTitle'),
        text: input.t('reengagement.checkInHint'),
      });
      continue;
    }

    if (item.kind === 'return-value') {
      items.push({
        id: item.id,
        kind: item.kind,
        icon: 'book-outline',
        title: input.t('reengagement.valueTitle'),
        text: input.t('reengagement.valueHint'),
        action: {
          label: input.t('reengagement.valueScale'),
          href: '/clinical-scales?openScale=uas7',
        },
        extraAction: {
          label: input.t('reengagement.valueArticle'),
          href: '/expert?article=pollinosis-basics',
        },
      });
      continue;
    }

    if (item.kind === 'return-reframe') {
      items.push({
        id: item.id,
        kind: item.kind,
        icon: 'map-outline',
        title: input.t('reengagement.reframeTitle'),
        text: input.t('reengagement.reframeHint'),
        action: {
          label: input.t('reengagement.reframeMap'),
          href: '/(tabs)/map',
        },
        extraAction: {
          label: input.t('reengagement.reframeSos'),
          href: '/(tabs)/sos',
        },
      });
      continue;
    }

    if (item.kind === 'return-restart') {
      items.push({
        id: item.id,
        kind: item.kind,
        icon: 'refresh-outline',
        title: input.t('reengagement.restartTitle'),
        text: input.t('reengagement.restartHint'),
        action: {
          label: input.t('reengagement.restartAction'),
          href: '/notifications',
        },
      });
      continue;
    }

    if (item.kind === 'act-due') {
      items.push({
        id: item.id,
        kind: item.kind,
        icon: 'pulse-outline',
        title: input.t('home.insightsActTitle'),
        text: input.t('home.insightsActText'),
        action: {
          label: input.t('home.insightsOpenAct'),
          href: '/clinical-scales',
        },
      });
      continue;
    }

    if (item.kind === 'therapy-reminder' && input.prescribedCourse) {
      items.push({
        id: item.id,
        kind: item.kind,
        icon: 'alarm-outline',
        title: input.t('home.insightsTherapyTitle'),
        text: nextIntake
          ? input.t('home.insightsTherapyText', {
              drug: input.prescribedCourse.drug,
              time: formatPrescribedReminderTime(nextIntake.hour, nextIntake.minute),
            })
          : input.t('home.insightsTherapyActiveText', {
              drug: input.prescribedCourse.drug,
            }),
        action: {
          label: input.t('home.insightsOpenTherapy'),
          href: '/(tabs)/diary',
        },
      });
      continue;
    }

    if (item.kind === 'wellness') {
      const rec = wellnessRecs[item.wellnessIndex ?? -1];
      if (!rec) continue;
      items.push({
        id: item.id,
        kind: item.kind,
        icon: 'leaf-outline',
        title: rec.title,
        text: rec.text,
      });
      continue;
    }

    const hint = input.phenotypeHints[item.phenotypeIndex ?? -1];
    if (!hint) continue;
    items.push({
      id: item.id,
      kind: item.kind,
      icon: 'alert-circle-outline',
      title: input.t('home.phenotypeHintsTitle'),
      text: hint,
      action: {
        label: input.t('home.insightsOpenProfile'),
        href: '/profile',
      },
    });
  }

  return items;
}

export async function loadDiaryEntriesForHome(profileId: number | null): Promise<DiaryEntry[]> {
  if (!profileId) return [];
  return getDiaryEntries(profileId);
}
