import { Text, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  latestDiaryTimestamp,
  calendarDaysBetween,
  resolveReturnStage,
  type DiaryEntry,
} from '@allerguide/core';
import { QuickCheckInCard } from '@/src/components/QuickCheckInCard';
import { DailyReadingCard } from '@/src/components/DailyReadingCard';
import { WeekRingCard } from '@/src/components/WeekRingCard';
import {
  buildTodayReading,
  formatTodayDate,
  hasCheckedInToday,
} from '@/src/services/today-reading-service';
import { trackReturnAction, trackReturnShown } from '@/src/services/reengagement-service';
import { fetchWellnessSnapshot, type WellnessSnapshot } from '@/src/services/wellness-service';
import { getCurrentLocation } from '@/src/services/location-service';
import { syncPollenReminderForProfile } from '@/src/services/pollen-reminder-service';
import { getProfileCapabilities } from '@/src/services/profile-capabilities-service';
import {
  buildHomeInsightItems,
  loadDiaryEntriesForHome,
  type HomeInsightItem,
} from '@/src/services/home-insights-service';
import { useAppStore } from '@/src/store/app-store';
import { useAsyncState } from '@/src/hooks/use-async-state';
import { Screen } from '@/src/components/Screen';
import { GlassCard } from '@/src/components/GlassCard';
import { TabScreenHeader } from '@/src/components/TabScreenHeader';
import { TierScale } from '@/src/components/TierScale';
import { CardTitle } from '@/src/components/CardTitle';
import { SkeletonCard } from '@/src/components/Skeleton';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { BrandTabIcon, BrandFeatureIcon } from '@/src/components/brand/BrandTabIcon';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { radii } from '@/src/constants/layout';
import { AI_CHAT_ENABLED } from '@/src/constants/features';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { resolveZoneColors, zoneFromWellnessVerbalTier } from '@/src/hooks/use-zone-colors';
import { useTranslation } from '@/src/store/locale-store';
import { ProfileHeaderButton } from '@/src/components/ProfileHeaderButton';
import { getProfileReassessmentHints } from '@/src/services/clinical-phenotype-service';
import { getDiaryEntries } from '@/src/services/diary-service';
import { getPrescribedCourse } from '@/src/services/prescribed-therapy-service';

export default function HomeScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, locale } = useTranslation();
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const profile = useAppStore((s) => s.activeProfile);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
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
    }, { profileId: activeProfileId ?? undefined });
  });
  const wellness = wellnessState.data;
  const loadingWellness = wellnessState.loading;
  const reloadWellness = wellnessState.reload;

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

  const pollenColors = wellness
    ? resolveZoneColors(zoneFromWellnessVerbalTier(wellness.display.pollenTier), theme.colors)
    : null;
  const airColors = wellness
    ? resolveZoneColors(zoneFromWellnessVerbalTier(wellness.display.airTier), theme.colors)
    : null;

  const phenotypeHints = useMemo(
    () => (profile ? getProfileReassessmentHints(profile) : []),
    [profile],
  );

  const returnStage = useMemo(
    () => resolveReturnStage({ lastDiaryAt: latestDiaryTimestamp(diaryEntries) }),
    [diaryEntries],
  );

  const checkedInToday = useMemo(() => hasCheckedInToday(diaryEntries), [diaryEntries]);
  const dateLabel = useMemo(() => formatTodayDate(locale), [locale]);
  const reading = useMemo(
    () => buildTodayReading({ profile, wellness, t }),
    [profile, wellness, t],
  );

  const insightItems = useMemo(
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

  return (
    <Screen
      onRefresh={
        activeProfileId
          ? () => {
              void wellnessState.refresh();
              void loadDiaryEntriesForHome(activeProfileId).then(setDiaryEntries);
            }
          : undefined
      }
      refreshing={wellnessState.refreshing}
      brandHeaderRight={
        <>
          <ProfileHeaderButton destination="hub" />
          <Pressable
            onPress={() => router.push('/(tabs)/sos')}
            style={styles.sosBtn}
            accessibilityRole="button"
            accessibilityLabel={t('tabs.sos')}
            hitSlop={8}>
            <BrandTabIcon name="sos" size={20} color={theme.colors.danger} />
          </Pressable>
        </>
      }>

      <TabScreenHeader eyebrow={dateLabel} title={profile?.name ?? t('tabs.today')} />

      {loadingWellness && !wellness ? (
        <>
          <SkeletonCard hero lines={3} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
        </>
      ) : (
        <DailyReadingCard reading={reading} />
      )}

      {activeProfileId && !(loadingWellness && !wellness) ? (
        <>
          <QuickCheckInCard
            profileId={activeProfileId}
            checkedInToday={checkedInToday}
            onSaved={reloadHomeData}
          />
          <WeekRingCard entries={diaryEntries} surface="today" />
          {AI_CHAT_ENABLED ? (
            <Button
              testID="today-ask"
              label={t('today.ask')}
              variant="ghost"
              block
              onPress={() => router.push('/ask')}
            />
          ) : null}
        </>
      ) : null}

      {wellness ? (
      <GlassCard variant="soft">
        <CardTitle>{t('home.factors')}</CardTitle>
        <Pressable
          onPress={() => setDetailsOpen(true)}
          accessibilityRole="button"
          style={ui.kpiRow}>
          <Text style={ui.kpiLabel}>{t('home.pollen')}</Text>
          <View style={styles.factorValue}>
            <TierScale
              activeIndex={verbalTierIndex(wellness.display.pollenTier)}
              zone={zoneFromWellnessVerbalTier(wellness.display.pollenTier)}
            />
            <Text style={[ui.kpiValue, pollenColors ? { color: pollenColors.fg } : null]}>
              {t(`wellness.pollen.${wellness.display.pollenTier}`)}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => setDetailsOpen(true)}
          accessibilityRole="button"
          style={ui.kpiRow}>
          <Text style={ui.kpiLabel}>{t('home.air')}</Text>
          <View style={styles.factorValue}>
            <TierScale
              activeIndex={verbalTierIndex(wellness.display.airTier)}
              zone={zoneFromWellnessVerbalTier(wellness.display.airTier)}
            />
            <Text style={[ui.kpiValue, airColors ? { color: airColors.fg } : null]}>
              {t(`wellness.air.${wellness.display.airTier}`)}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => setDetailsOpen(true)}
          accessibilityRole="button"
          style={ui.kpiRow}>
          <Text style={ui.kpiLabel}>{t('home.diary')}</Text>
          <View style={styles.factorValue}>
            <TierScale
              activeIndex={verbalTierIndex(wellness.display.diaryTier)}
              zone={zoneFromWellnessVerbalTier(wellness.display.diaryTier)}
            />
            <Text style={ui.kpiValue}>{t(`wellness.diaryState.${wellness.display.diaryTier}`)}</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setDetailsOpen((open) => !open)}
          accessibilityRole="button"
          testID="home-wellness-details">
          <Text style={styles.detailsToggle}>
            {detailsOpen ? t('home.wellnessHideDetails') : t('home.wellnessDetails')}
          </Text>
        </Pressable>

        {detailsOpen ? (
          <>
            <View style={ui.kpiRow}>
              <Text style={ui.kpiLabel}>{t('home.index')}</Text>
              <Text style={ui.kpiValue}>
                {t(`wellness.index.${wellness.display.indexTier}`)} · {wellness.score}/100
              </Text>
            </View>
            {wellness.factors.map((factor) => {
              const category =
                factor.label === t('home.pollen') || factor.label === t('wellness.pollenLabel')
                  ? t(`wellness.pollen.${wellness.display.pollenTier}`)
                  : factor.label === t('home.air') || factor.label === t('wellness.airLabel')
                    ? t(`wellness.air.${wellness.display.airTier}`)
                    : t(`wellness.diaryState.${wellness.display.diaryTier}`);
              return (
                <View key={factor.label} style={styles.detailBlock}>
                  <View style={ui.kpiRow}>
                    <Text style={ui.kpiLabel}>{factor.label}</Text>
                    <Text style={ui.kpiValue}>{category}</Text>
                  </View>
                  <Text style={styles.detailExact}>{factor.value}</Text>
                </View>
              );
            })}
            <Text style={styles.interpret}>{wellness.statusSummary}</Text>
          </>
        ) : null}
      </GlassCard>
      ) : null}

      {loadingWellness && !wellness ? null : (
      <>
      <GlassCard padded={false}>
        <View style={[styles.listHead, styles.listHeadPad]}>
          <CardTitle>{t('home.insightsTitle')}</CardTitle>
        </View>
        {insightItems.length === 0 ? (
          <View style={styles.emptyInsights}>
            <Text style={styles.emptyInsightsText}>{t('home.insightsEmpty')}</Text>
          </View>
        ) : (
          insightItems.map((item, index) => (
            <InsightRow
              key={item.id}
              item={item}
              bordered={index < insightItems.length - 1}
              styles={styles}
              ui={ui}
              theme={theme}
            />
          ))
        )}
      </GlassCard>

      <GlassCard padded={false}>
        <Pressable
          style={styles.expertRow}
          onPress={() => router.push('/expert')}
          accessibilityRole="button"
          accessibilityLabel={t('home.expert')}>
          <View style={styles.expertIcon}>
            <BrandFeatureIcon name="expert" size={20} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.expertBody}>
            <Text style={ui.feedTitle}>{t('home.expert')}</Text>
            <Text style={ui.feedSub}>{t('more.expertDesc')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </Pressable>
      </GlassCard>
      </>
      )}

      <Disclaimer compact>{t('home.disclaimerShort')}</Disclaimer>
    </Screen>
  );
}

function InsightRow({
  item,
  bordered,
  styles,
  ui,
  theme,
}: {
  item: HomeInsightItem;
  bordered: boolean;
  styles: ReturnType<typeof createStyles>;
  ui: ReturnType<typeof useUiStyles>;
  theme: AppTheme;
}) {
  return (
    <View style={[styles.listRow, bordered && styles.listRowBorder]}>
      <View style={ui.feedIcon}>
        <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={16} color={theme.colors.textSecondary} />
      </View>
      <View style={ui.feedBody}>
        <Text style={ui.feedTitle}>{item.title}</Text>
        <Text style={ui.feedSub}>{item.text}</Text>
      </View>
      {item.action || item.extraAction ? (
        <View style={styles.insightActions}>
          {item.action ? (
            <Button
              label={item.action.label}
              variant="ghost"
              size="sm"
              onPress={() => {
                if (item.kind.startsWith('return-')) {
                  trackReturnAction(item.kind.replace('return-', '') as never, 'cta');
                }
                router.push(item.action!.href as never);
              }}
            />
          ) : null}
          {item.extraAction ? (
            <Button
              label={item.extraAction.label}
              variant="ghost"
              size="sm"
              onPress={() => {
                if (item.kind.startsWith('return-')) {
                  trackReturnAction(item.kind.replace('return-', '') as never, 'extra');
                }
                router.push(item.extraAction!.href as never);
              }}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    sosBtn: {
      width: 40,
      height: 40,
      borderRadius: radii.sm,
      backgroundColor: colors.dangerLight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    heroKpiLeft: { gap: 8 },
    heroKpiLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.head,
    },
    statusPhrase: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.head,
    },
    envHint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
    },
    detailsToggle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
      marginTop: 10,
    },
    interpret: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    detailBlock: {
      marginTop: 8,
      gap: 2,
    },
    detailExact: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
    },
    listHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    listHeadPad: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    listRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    insightActions: { gap: 4, alignItems: 'flex-end' },
    emptyInsights: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    emptyInsightsText: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    expertRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    expertIcon: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    expertBody: { flex: 1, gap: 2 },
    factorValue: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  });
}

function verbalTierIndex(tier: string): number {
  if (tier === 'none') return 0;
  if (tier === 'low') return 1;
  if (tier === 'moderate') return 2;
  if (tier === 'high') return 3;
  return 0;
}
