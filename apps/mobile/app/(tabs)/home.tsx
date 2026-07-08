import { Text, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { getDiaryEntries } from '@/src/services/diary-service';
import { fetchWellnessSnapshot, type WellnessSnapshot } from '@/src/services/wellness-service';
import { getCurrentLocation } from '@/src/services/location-service';
import { syncPollenReminderForProfile } from '@/src/services/pollen-reminder-service';
import { useAppStore } from '@/src/store/app-store';
import { useAsyncState } from '@/src/hooks/use-async-state';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
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

  useFocusEffect(
    useCallback(() => {
      void reloadWellness();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reloadWellness, activeProfileId, locale]),
  );

  useEffect(() => {
    if (!wellness || !activeProfileId || !profile) return;
    void syncPollenReminderForProfile(
      activeProfileId,
      profile.name,
      wellness.pollenMatches,
      wellness.envDataAvailable,
    );
  }, [wellness, activeProfileId, profile]);

  const diaryRows = useMemo(
    () =>
      [
        { label: t('home.symptoms'), icon: 'pulse', route: '/(tabs)/diary', sub: t('home.symptomsSub') },
        { label: t('home.food'), icon: 'restaurant', route: '/(tabs)/diary', sub: t('home.foodSub') },
        { label: t('home.medicine'), icon: 'medkit', route: '/(tabs)/diary', sub: t('home.medicineSub') },
      ] as const,
    [t],
  );

  const badge = wellness ? badgeStyle(wellnessBadgeKind(wellness.level), theme) : null;
  const confidenceBadge = wellness
    ? badgeStyle(confidenceBadgeKind(wellness.confidence), theme)
    : null;

  const phenotypeHints = useMemo(
    () => (profile ? getProfileReassessmentHints(profile) : []),
    [profile],
  );

  const todayLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(new Date());
    } catch {
      return t('home.today');
    }
  }, [locale, t]);

  return (
    <Screen
      onRefresh={activeProfileId ? () => void wellnessState.refresh() : undefined}
      refreshing={wellnessState.refreshing}>
      <View style={styles.topBar}>
        <BrandLogo size={32} showWordmark style={styles.topBarLogo} />
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

      <View style={styles.heroCalm}>
        <Text style={ui.docTitle}>{t('home.today')}</Text>
        <Text style={ui.docMeta}>
          {todayLabel}
          {profile?.name ? ` · ${t('home.profilePrefix')}: ${profile.name}` : ` · ${t('home.selectProfile')}`}
        </Text>
      </View>

      <ProfileSwitcher />

      <GlassCard variant="calm">
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
          <Text style={ui.cardTitle}>{t('home.diary')}</Text>
          <Pressable onPress={() => router.push('/(tabs)/diary')}>
            <Text style={ui.sectionLink}>{t('common.more')}</Text>
          </Pressable>
        </View>
        {diaryRows.map((row, index) => (
          <View
            key={row.label}
            style={[styles.listRow, index < diaryRows.length - 1 && styles.listRowBorder]}>
            <View style={ui.feedIcon}>
              <Ionicons name={row.icon as any} size={16} color={theme.colors.textSecondary} />
            </View>
            <View style={ui.feedBody}>
              <Text style={ui.feedTitle}>{row.label}</Text>
              <Text style={ui.feedSub}>{row.sub}</Text>
            </View>
            <Button
              label={t('home.addEntry')}
              variant="primary"
              size="sm"
              onPress={() => router.push(row.route as any)}
            />
          </View>
        ))}
      </GlassCard>

      {phenotypeHints.length ? (
        <GlassCard style={styles.recCard}>
          <Text style={styles.recTitle}>{t('home.phenotypeHintsTitle')}</Text>
          {phenotypeHints.map((hint) => (
            <Text key={hint} style={styles.recText}>
              • {hint}
            </Text>
          ))}
        </GlassCard>
      ) : null}

      {wellness?.recommendations[0] ? (
        <GlassCard style={styles.recCard}>
          <Text style={styles.recTitle}>{wellness.recommendations[0].title}</Text>
          <Text style={styles.recText}>{wellness.recommendations[0].text}</Text>
        </GlassCard>
      ) : null}

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

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    topBarLogo: {
      flexShrink: 1,
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
    heroCalm: {
      gap: 4,
      backgroundColor: colors.calmWash,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.calmMist,
      paddingHorizontal: 16,
      paddingVertical: 14,
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
    recCard: { gap: 6 },
    recTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    recText: {
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
