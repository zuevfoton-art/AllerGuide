import { Text, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  latestDiaryTimestamp,
  calendarDaysBetween,
  resolveReturnStage,
  startOfLocalDay,
  type DiaryEntry,
} from '@allerguide/core';
import { ImmuneBalanceCard } from '@/src/components/ImmuneBalanceCard';
import { WellnessSummary } from '@/src/components/WellnessSummary';
import {
  formatTodayDate,
} from '@/src/services/today-reading-service';
import { trackReturnShown } from '@/src/services/reengagement-service';
import { fetchWellnessSnapshot, type WellnessSnapshot } from '@/src/services/wellness-service';
import { getCurrentLocation } from '@/src/services/location-service';
import { syncPollenReminderForProfile } from '@/src/services/pollen-reminder-service';
import { getProfileCapabilities } from '@/src/services/profile-capabilities-service';
import {
  buildHomeInsightItems,
  loadDiaryEntriesForHome,
} from '@/src/services/home-insights-service';
import { useAppStore } from '@/src/store/app-store';
import { useAsyncState } from '@/src/hooks/use-async-state';
import { Screen } from '@/src/components/Screen';
import { SkeletonCard } from '@/src/components/Skeleton';
import { HintAnchor } from '@/src/components/hints/HintAnchor';
import { useHintTour } from '@/src/hooks/use-hint-tour';
import { getProfileReassessmentHints } from '@/src/services/clinical-phenotype-service';
import { getDiaryEntries } from '@/src/services/diary-service';
import { getPrescribedCourse } from '@/src/services/prescribed-therapy-service';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { density, radii, space } from '@/src/constants/layout';
import { fontSizes, lineHeights, scaledTextProps } from '@/src/constants/typography';
import { useTranslation } from '@/src/store/locale-store';

function profileInitials(name?: string): string {
  if (!name) return 'AG';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function HomeScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, locale } = useTranslation();
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const profile = useAppStore((s) => s.activeProfile);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const selectedDay = useMemo(() => startOfLocalDay(new Date()), []);
  const prescribedCourse = activeProfileId ? getPrescribedCourse(activeProfileId) : null;

  const [capabilitiesTick, setCapabilitiesTick] = useState(0);
  const profileCapabilities = useMemo(
    () => (profile ? getProfileCapabilities(profile) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick re-reads condition gating from settings
    [profile, capabilitiesTick],
  );

  const wellnessState = useAsyncState<WellnessSnapshot | null>(async () => {
    if (!activeProfileId || !profile) return null;
    const entries = await getDiaryEntries(activeProfileId);
    const location = await getCurrentLocation();
    return fetchWellnessSnapshot(profile.allergies, entries, locale, {
      lat: location.lat,
      lon: location.lon,
      label: location.label,
    }, { profileId: activeProfileId ?? undefined, asOf: selectedDay });
  });
  const wellness = wellnessState.data;
  const loadingWellness = wellnessState.loading;
  const reloadWellness = wellnessState.reload;
  useHintTour('home', { ready: !loadingWellness });

  const reloadHomeData = useCallback(() => {
    void reloadWellness();
    if (!activeProfileId) {
      setDiaryEntries([]);
      return;
    }
    void loadDiaryEntriesForHome(activeProfileId).then(setDiaryEntries);
  }, [reloadWellness, activeProfileId]);

  useFocusEffect(
    useCallback(() => {
      setCapabilitiesTick((tick) => tick + 1);
      reloadHomeData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reloadHomeData, locale]),
  );

  useEffect(() => {
    if (!wellness || !activeProfileId || !profile || !profileCapabilities) return;
    if (!profileCapabilities.reminders.pollen) {
      void syncPollenReminderForProfile(activeProfileId, profile.name, [], false);
      return;
    }
    void syncPollenReminderForProfile(
      activeProfileId,
      profile.name,
      wellness.pollenMatches,
      wellness.envDataAvailable,
    );
  }, [wellness, activeProfileId, profile, profileCapabilities]);

  const phenotypeHints = useMemo(
    () => (profile ? getProfileReassessmentHints(profile) : []),
    [profile],
  );

  const returnStage = useMemo(
    () => resolveReturnStage({ lastDiaryAt: latestDiaryTimestamp(diaryEntries) }),
    [diaryEntries],
  );

  const dateLabel = useMemo(() => formatTodayDate(locale), [locale]);

  const insights = useMemo(
    () =>
      buildHomeInsightItems({
        profile,
        diaryEntries,
        wellness,
        phenotypeHints,
        prescribedCourse,
        returnStage,
        hasStandaloneCheckIn: Boolean(activeProfileId),
        t,
      }),
    [
      profile,
      diaryEntries,
      wellness,
      phenotypeHints,
      prescribedCourse,
      returnStage,
      activeProfileId,
      t,
    ],
  );

  useEffect(() => {
    if (!returnStage) return;
    const last = latestDiaryTimestamp(diaryEntries);
    const gap = last ? calendarDaysBetween(new Date(last), new Date()) : 0;
    trackReturnShown(returnStage, gap, 'home');
  }, [returnStage, diaryEntries]);

  const greeting = profile?.name
    ? t('home.greeting', { name: profile.name })
    : t('home.greetingAnon');
  const recs = insights.items.slice(0, 2);
  const pollenValue =
    wellness?.display.pollenValue != null ? wellness.display.pollenValue.toFixed(1) : '—';
  const aqiValue = wellness?.display.pm25 != null ? String(Math.round(wellness.display.pm25)) : '—';
  const symptomValue = wellness ? String(wellness.display.symptomDays) : '—';

  return (
    <Screen
      showBrandHeader={false}
      onRefresh={
        activeProfileId
          ? () => {
              void wellnessState.refresh();
              void loadDiaryEntriesForHome(activeProfileId).then(setDiaryEntries);
            }
          : undefined
      }
      refreshing={wellnessState.refreshing}>
      <View style={styles.topHeader}>
        <View style={styles.greetingBlock}>
          <Text {...scaledTextProps} style={styles.greeting}>
            {greeting}
          </Text>
          <Text {...scaledTextProps} style={styles.date}>
            {dateLabel}
          </Text>
        </View>
        <HintAnchor id="home.profile">
        <Pressable
          testID="profile-header-button"
          onPress={() => router.push('/profile')}
          style={styles.avatar}
          accessibilityRole="button"
          accessibilityLabel={t('home.selectProfile')}>
          <Text style={styles.avatarText}>{profileInitials(profile?.name)}</Text>
        </Pressable>
        </HintAnchor>
      </View>

      {loadingWellness && !wellness ? (
        <>
          <SkeletonCard hero lines={3} />
          <SkeletonCard lines={3} />
        </>
      ) : wellness ? (
        <HintAnchor id="home.wellness" testID="home-wellness-kpi">
          <ImmuneBalanceCard wellness={wellness} />
        </HintAnchor>
      ) : null}

      {wellness ? (
        <WellnessSummary
          testID="home-wellness-summary"
          title={t('home.wellnessSummary')}
          items={[
            {
              label: t('home.pollenIndex'),
              value: pollenValue,
              color: theme.colors.ringMedicine,
            },
            {
              label: t('home.airQuality'),
              value: aqiValue,
              unit: 'AQI',
              color: theme.colors.accent,
            },
            {
              label: t('home.symptoms'),
              value: symptomValue,
              color: theme.colors.ringAllergen,
            },
          ]}
        />
      ) : null}

      <HintAnchor id="home.insights" testID="home-insights">
        <View style={styles.section}>
          <Text {...scaledTextProps} style={styles.blockHeading}>
            {t('home.insightsTitle')}
          </Text>
          {recs.length === 0 ? (
            <Text style={styles.emptyRecs}>{t('home.insightsEmpty')}</Text>
          ) : (
            recs.map((item) => (
              <View key={item.id} style={styles.recCard}>
                <Ionicons
                  name={item.icon as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color={theme.colors.accent}
                />
                <View style={styles.recText}>
                  <Text {...scaledTextProps} style={styles.recTitle}>
                    {item.title}
                  </Text>
                  <Text {...scaledTextProps} style={styles.recDesc}>
                    {item.text}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </HintAnchor>

      <View style={styles.section}>
        <Text {...scaledTextProps} style={styles.blockHeading}>
          {t('home.expert')}
        </Text>
        <View style={styles.expertCard}>
          <View style={styles.expertAvatar}>
            <Text style={styles.expertAvatarText}>{t('home.expertInitials')}</Text>
          </View>
          <View style={styles.expertInfo}>
            <Text {...scaledTextProps} style={styles.expertName}>
              {t('home.expertName')}
            </Text>
            <Text {...scaledTextProps} style={styles.expertSpecialty}>
              {t('home.expertSpecialty')}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/expert')}
            style={styles.expertBtn}
            accessibilityRole="button"
            accessibilityLabel={t('home.expertBook')}
            hitSlop={8}>
            <Text style={styles.expertBtnText}>{t('home.expertBook')}</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    topHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: space[2],
    },
    greetingBlock: { flex: 1, paddingRight: space[3] },
    greeting: {
      fontFamily: fonts.sansBold,
      fontSize: fontSizes.h2,
      lineHeight: lineHeights.h2,
      fontWeight: '700',
      color: colors.head,
    },
    date: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      color: colors.textSecondary,
      marginTop: space[1],
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.body,
      fontWeight: '600',
      color: colors.onAccent,
    },
    section: { gap: space[3], paddingTop: space[2] },
    blockHeading: {
      fontFamily: fonts.sansBold,
      fontSize: fontSizes.h4,
      lineHeight: lineHeights.h4,
      fontWeight: '700',
      color: colors.head,
    },
    emptyRecs: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.bodySm,
      color: colors.textSecondary,
      lineHeight: lineHeights.bodySm,
    },
    recCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      padding: density.cardPadding,
    },
    recText: { flex: 1, gap: space[1] },
    recTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.body,
      fontWeight: '600',
      color: colors.head,
    },
    recDesc: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.label,
      color: colors.textSecondary,
    },
    expertCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      padding: density.cardPadding,
    },
    expertAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    expertAvatarText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.body,
      fontWeight: '600',
      color: colors.accent,
    },
    expertInfo: { flex: 1, gap: 2 },
    expertName: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.body,
      fontWeight: '600',
      color: colors.head,
    },
    expertSpecialty: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.label,
      color: colors.textSecondary,
    },
    expertBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radii.lg,
      minHeight: density.tapMinHeightSm,
      justifyContent: 'center',
    },
    expertBtnText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.label,
      fontWeight: '600',
      color: colors.onAccent,
    },
  });
}
