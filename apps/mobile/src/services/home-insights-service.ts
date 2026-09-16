import {
  computeNextPrescribedIntake,
  formatPrescribedReminderTime,
  isPrescribedCourseConfigured,
  planHomeInsights,
  resolveVisibleHomeInsights,
  type DiaryEntry,
  type InsightCriticality,
  type PlannedHomeInsightKind,
  type PrescribedCourse,
  type Profile,
  type ReturnStage,
} from '@allerguide/core';
import { getStoredProfileConditions } from '@/src/services/profile-conditions-service';
import { getProfileCapabilities } from '@/src/services/profile-capabilities-service';
import { listEmergencyContacts } from '@/src/services/sos-service';
import type { WellnessSnapshot } from '@/src/services/wellness-service';
import { getDiaryEntries } from '@/src/services/diary-service';

export type HomeInsightAction = {
  label: string;
  href: string;
};

export type HomeInsightItem = {
  id: string;
  kind: PlannedHomeInsightKind;
  criticality: InsightCriticality;
  icon: string;
  title: string;
  text: string;
  action?: HomeInsightAction;
  extraAction?: HomeInsightAction;
};

export type HomeInsightsBuildResult = {
  items: HomeInsightItem[];
  collapsedCount: number;
  collapsedItems: HomeInsightItem[];
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

function localizePlannedInsight(
  item: ReturnType<typeof planHomeInsights>[number],
  input: {
    prescribedCourse?: PrescribedCourse | null;
    wellnessRecs: NonNullable<WellnessSnapshot['recommendations']>;
    phenotypeHints: string[];
    t: Translate;
  },
): HomeInsightItem | null {
  const base = { id: item.id, kind: item.kind, criticality: item.criticality };

  if (item.kind === 'select-profile') {
    return {
      ...base,
      icon: 'person-outline',
      title: input.t('home.insightsSelectProfileTitle'),
      text: input.t('home.insightsSelectProfileText'),
      action: { label: input.t('home.insightsOpenProfiles'), href: '/profile' },
    };
  }

  if (item.kind === 'diary-missing-today') {
    return {
      ...base,
      icon: 'create-outline',
      title: input.t('home.insightsDiaryTitle'),
      text: input.t('home.insightsDiaryText'),
      action: { label: input.t('home.insightsOpenDiary'), href: '/(tabs)/diary' },
    };
  }

  if (item.kind === 'return-quick-checkin') {
    return {
      ...base,
      icon: 'heart-outline',
      title: input.t('reengagement.checkInTitle'),
      text: input.t('reengagement.checkInHint'),
    };
  }

  if (item.kind === 'return-value') {
    return {
      ...base,
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
    };
  }

  if (item.kind === 'return-reframe') {
    return {
      ...base,
      icon: 'map-outline',
      title: input.t('reengagement.reframeTitle'),
      text: input.t('reengagement.reframeHint'),
      action: { label: input.t('reengagement.reframeMap'), href: '/(tabs)/map' },
      extraAction: { label: input.t('reengagement.reframeSos'), href: '/(tabs)/sos' },
    };
  }

  if (item.kind === 'return-restart') {
    return {
      ...base,
      icon: 'refresh-outline',
      title: input.t('reengagement.restartTitle'),
      text: input.t('reengagement.restartHint'),
      action: { label: input.t('reengagement.restartAction'), href: '/notifications' },
    };
  }

  if (item.kind === 'profile-incomplete') {
    return {
      ...base,
      icon: 'shield-checkmark-outline',
      title: input.t('home.insightsCompleteProfileTitle'),
      text: input.t('home.insightsCompleteProfileText'),
      action: { label: input.t('home.insightsCompleteProfileAction'), href: '/sos-edit' },
    };
  }

  if (item.kind === 'act-due') {
    return {
      ...base,
      icon: 'pulse-outline',
      title: input.t('home.insightsActTitle'),
      text: input.t('home.insightsActText'),
      action: { label: input.t('home.insightsOpenAct'), href: '/clinical-scales' },
    };
  }

  if (item.kind === 'therapy-reminder' && input.prescribedCourse) {
    const nextIntake = isPrescribedCourseConfigured(input.prescribedCourse)
      ? computeNextPrescribedIntake(input.prescribedCourse)
      : null;
    return {
      ...base,
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
      action: { label: input.t('home.insightsOpenTherapy'), href: '/(tabs)/diary' },
    };
  }

  if (item.kind === 'wellness') {
    const rec = input.wellnessRecs[item.wellnessIndex ?? -1];
    if (!rec) return null;
    return {
      ...base,
      icon: 'leaf-outline',
      title: rec.title,
      text: rec.text,
    };
  }

  const hint = input.phenotypeHints[item.phenotypeIndex ?? -1];
  if (!hint) return null;
  return {
    ...base,
    icon: 'alert-circle-outline',
    title: input.t('home.phenotypeHintsTitle'),
    text: hint,
    action: { label: input.t('home.insightsOpenProfile'), href: '/profile' },
  };
}

export function buildHomeInsightItems(input: {
  profile: Profile | null;
  diaryEntries: DiaryEntry[];
  wellness: WellnessSnapshot | null;
  phenotypeHints: string[];
  prescribedCourse?: PrescribedCourse | null;
  returnStage?: ReturnStage | null;
  hasStandaloneCheckIn?: boolean;
  t: Translate;
}): HomeInsightsBuildResult {
  const capabilities = input.profile ? getProfileCapabilities(input.profile) : null;
  const conditions = input.profile ? getStoredProfileConditions(input.profile.id) : [];
  const wellnessRecs = filterWellnessRecommendations(
    input.wellness,
    Boolean(capabilities?.reminders.pollen),
  );

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
    hasStandaloneCheckIn: input.hasStandaloneCheckIn,
    hasEmergencyContacts: input.profile
      ? listEmergencyContacts(input.profile.id).length > 0
      : undefined,
  });

  const { visible, collapsed } = resolveVisibleHomeInsights(planned);
  const localize = (item: (typeof planned)[number]) =>
    localizePlannedInsight(item, {
      prescribedCourse: input.prescribedCourse,
      wellnessRecs,
      phenotypeHints: input.phenotypeHints,
      t: input.t,
    });

  const items: HomeInsightItem[] = [];
  for (const item of visible) {
    const localized = localize(item);
    if (localized) items.push(localized);
  }

  const collapsedItems: HomeInsightItem[] = [];
  for (const item of collapsed) {
    const localized = localize(item);
    if (localized) collapsedItems.push(localized);
  }

  return { items, collapsedCount: collapsedItems.length, collapsedItems };
}

export async function loadDiaryEntriesForHome(profileId: number | null): Promise<DiaryEntry[]> {
  if (profileId == null) return [];
  return getDiaryEntries(profileId);
}
