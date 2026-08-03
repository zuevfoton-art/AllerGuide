import { Text, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DiaryEntry } from '@allerguide/core';
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
import { Skeleton } from '@/src/components/Skeleton';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { BrandTabIcon, BrandFeatureIcon } from '@/src/components/brand/BrandTabIcon';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { radii } from '@/src/constants/layout';
import { badgeStyle, useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTranslation } from '@/src/store/locale-store';
import { BrandLogo } from '@/src/components/brand/BrandLogo';
import { ProfileHeaderButton } from '@/src/components/ProfileHeaderButton';
import { getProfileReassessmentHints } from '@/src/services/clinical-phenotype-service';
import { getDiaryEntries } from '@/src/services/diary-service';

function wellnessBadgeKind(level: WellnessSnapshot['level']): 'ok' | 'warn' | 'danger' {
  if (level === 'good') return 'ok';
  if (level === 'high-risk') return 'danger';
  return 'warn';
}

function confidenceBadgeKind(
  confidence: WellnessSnapshot['confidence'],
): 'ok' | 'warn' | 'danger' {
  if (confidence === 'high') return 'ok';
  if (confidence === 'low') return 'danger';
  return 'warn';
}

export default function HomeScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, locale } = useTranslation();
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const profile = useAppStore((s) => s.activeProfile);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);

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

  const badge = wellness ? badgeStyle(wellnessBadgeKind(wellness.level), theme) : null;
  const confidenceBadge = wellness
    ? badgeStyle(confidenceBadgeKind(wellness.confidence), theme)
    : null;

  const phenotypeHints = useMemo(
    () => (profile ? getProfileReassessmentHints(profile) : []),
    [profile],
  );

  const insightItems = useMemo(
    () =>
      buildHomeInsightItems({
        profile,
        diaryEntries,
        wellness,
        phenotypeHints,
        t,
      }),
    [profile, diaryEntries, wellness, phenotypeHints, t],
  );

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
      refreshing={wellnessState.refreshing}>
      <View style={styles.topBar}>
        <View style={styles.brandBlock}>
          <BrandLogo size={32} style={styles.topBarLogo} />
          <Text style={styles.tagline}>{t('onboarding.tagline')}</Text>
        </View>
        <View style={styles.topBarActions}>
          <ProfileHeaderButton />
          <Pressable
            onPress={() => router.push('/(tabs)/sos')}
            style={styles.sosBtn}
            accessibilityRole="button"
            accessibilityLabel={t('tabs.sos')}>
            <BrandTabIcon name="sos" size={20} color={theme.colors.danger} />
          </Pressable>
        </View>
      </View>

      <GlassCard variant="soft">
        <View style={ui.cardHead}>
          <Text style={ui.cardTitle}>{t('home.wellnessTitle')}</Text>
          <View style={styles.cardHeadRight}>
            {badge ? (
              <View style={[ui.badge, badge.container]}>
                <Text style={[ui.badgeText, badge.text]}>{wellness?.statusTitle}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {loadingWellness && !wellness ? (
          <View style={styles.skeletonWrap}>
            <Skeleton width={120} height={32} />
            <Skeleton width="100%" height={14} />
            <Skeleton width="100%" height={14} />
            <Skeleton width="70%" height={14} />
          </View>
        ) : wellness ? (
          <>
            <View style={ui.heroKpi}>
              <Text style={styles.heroKpiLabel}>{t('home.index')}</Text>
              <Text style={ui.heroKpiNum}>
                {wellness.score}
                <Text style={ui.heroKpiSub}> / 100</Text>
              </Text>
            </View>

            <View style={styles.metaRow}>
              {confidenceBadge ? (
                <View style={[ui.badge, confidenceBadge.container, styles.confidenceBadge]}>
                  <Text style={[ui.badgeText, confidenceBadge.text]}>
                    {t(`wellness.confidence.${wellness.confidence}`)}
                  </Text>
                </View>
              ) : null}
              {!wellness.envDataAvailable ? (
                <Text style={styles.envHint}>{t('wellness.envUnavailable')}</Text>
              ) : null}
            </View>

            {wellness.factors.slice(0, 3).map((factor) => (
              <View key={factor.label} style={ui.kpiRow}>
                <Text style={ui.kpiLabel}>
                  {factor.label.replace(' · Open-Meteo', '').replace(' · EAQI', '')}
                </Text>
                <Text style={ui.kpiValue}>{factor.value}</Text>
              </View>
            ))}

            <Text style={styles.interpret}>{wellness.statusSummary}</Text>
          </>
        ) : (
          <Text style={styles.interpret}>{t('home.selectProfile')}</Text>
        )}
      </GlassCard>

      <GlassCard padded={false}>
        <View style={[styles.listHead, styles.listHeadPad]}>
          <Text style={ui.cardTitle}>{t('home.insightsTitle')}</Text>
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
            <BrandFeatureIcon name="expert" size={20} color={theme.colors.accent} />
          </View>
          <View style={styles.expertBody}>
            <Text style={ui.feedTitle}>{t('home.expert')}</Text>
            <Text style={ui.feedSub}>{t('more.expertDesc')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </Pressable>
      </GlassCard>

      <Disclaimer showMdrFootnote>{t('home.disclaimer')}</Disclaimer>
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
      {item.action ? (
        <Button
          label={item.action.label}
          variant="primary"
          size="sm"
          onPress={() => router.push(item.action!.href as never)}
        />
      ) : null}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    brandBlock: {
      flexShrink: 1,
      gap: 2,
    },
    topBarLogo: {
      flexShrink: 1,
    },
    tagline: {
      fontFamily: fonts.sans,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
      letterSpacing: 0.2,
    },
    topBarActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
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
    skeletonWrap: { gap: 10, paddingVertical: 12 },
    cardHeadRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    heroKpiLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.head,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
      marginTop: 6,
    },
    confidenceBadge: {
      alignSelf: 'flex-start',
    },
    envHint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
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
      backgroundColor: colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    expertBody: { flex: 1, gap: 2 },
  });
}
