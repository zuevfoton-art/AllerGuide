import { Text, Pressable, StyleSheet, View, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { computeDiaryStats } from '@allerguide/core';
import { getDiaryEntries } from '@/src/services/diary-service';
import { fetchWellnessSnapshot, type WellnessSnapshot } from '@/src/services/wellness-service';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { BrandTabIcon } from '@/src/components/brand/BrandTabIcon';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { badgeStyle, useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTranslation } from '@/src/store/locale-store';

function wellnessBadgeKind(level: WellnessSnapshot['level']): 'ok' | 'warn' | 'danger' {
  if (level === 'good') return 'ok';
  if (level === 'high-risk') return 'danger';
  return 'warn';
}

export default function HomeScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, locale } = useTranslation();
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const profile = useAppStore((s) => s.activeProfile);
  const [wellness, setWellness] = useState<WellnessSnapshot | null>(null);
  const [loadingWellness, setLoadingWellness] = useState(false);

  const loadWellness = useCallback(async () => {
    if (!activeProfileId || !profile) return;
    setLoadingWellness(true);
    try {
      const entries = await getDiaryEntries(activeProfileId);
      const stats = computeDiaryStats(entries);
      const allergies = profile.allergies.split(',').map((a) => a.trim()).filter(Boolean);
      const snapshot = await fetchWellnessSnapshot(allergies, {
        recentSymptoms: stats.recentSymptoms.length > 0,
        recentTriggers: stats.entriesLast7Days > 0 && stats.recentSymptoms.length > 0,
      }, locale);
      setWellness(snapshot);
    } finally {
      setLoadingWellness(false);
    }
  }, [activeProfileId, profile, locale]);

  useFocusEffect(
    useCallback(() => {
      void loadWellness();
    }, [loadWellness]),
  );

  const diaryRows = useMemo(
    () =>
      [
        { label: t('home.symptoms'), icon: 'pulse', route: '/(tabs)/diary', sub: t('home.symptomsSub') },
        { label: t('home.food'), icon: 'restaurant', route: '/(tabs)/diary', sub: t('home.foodSub') },
        { label: t('home.medicine'), icon: 'medkit', route: '/(tabs)/diary', sub: t('home.medicineSub') },
      ] as const,
    [t, locale],
  );

  const badge = wellness ? badgeStyle(wellnessBadgeKind(wellness.level), theme) : null;

  const todayLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(new Date());
    } catch {
      return t('home.today');
    }
  }, [locale, t]);

  return (
    <Screen>
      <View style={styles.topBar}>
        <Text style={ui.docLabel}>AllerGuide · {t('home.summary')}</Text>
        <Pressable
          onPress={() => router.push('/(tabs)/sos')}
          style={styles.sosBtn}
          accessibilityRole="button"
          accessibilityLabel={t('tabs.sos')}>
          <BrandTabIcon name="sos" size={20} color={theme.colors.danger} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={ui.docTitle}>{t('home.today')}</Text>
        <Text style={ui.docMeta}>
          {todayLabel}
          {profile?.name ? ` · ${t('home.profilePrefix')}: ${profile.name}` : ` · ${t('home.selectProfile')}`}
        </Text>
      </View>

      <ProfileSwitcher />

      <GlassCard>
        <View style={ui.cardHead}>
          <Text style={ui.cardTitle}>{t('home.wellnessTitle')}</Text>
          <View style={styles.cardHeadRight}>
            {badge ? (
              <View style={[ui.badge, badge.container]}>
                <Text style={[ui.badgeText, badge.text]}>{wellness?.statusTitle}</Text>
              </View>
            ) : null}
            <Pressable onPress={() => router.push('/(tabs)/map')}>
              <Text style={ui.sectionLink}>{t('home.details')}</Text>
            </Pressable>
          </View>
        </View>

        {loadingWellness && !wellness ? (
          <ActivityIndicator color={theme.colors.accent} style={{ marginVertical: 24 }} />
        ) : wellness ? (
          <>
            <View style={ui.heroKpi}>
              <Text style={styles.heroKpiLabel}>{t('home.index')}</Text>
              <Text style={ui.heroKpiNum}>
                {wellness.score}
                <Text style={ui.heroKpiSub}> / 100</Text>
              </Text>
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

      {wellness?.recommendations[0] ? (
        <GlassCard style={styles.recCard}>
          <Text style={styles.recTitle}>{wellness.recommendations[0].title}</Text>
          <Text style={styles.recText}>{wellness.recommendations[0].text}</Text>
        </GlassCard>
      ) : null}

      <View style={styles.quickRow}>
        <Button
          label={t('tabs.scanner')}
          variant="secondary"
          style={styles.quickBtn}
          onPress={() => router.push('/(tabs)/scanner')}
        />
        <Button
          label={t('tabs.map')}
          variant="secondary"
          style={styles.quickBtn}
          onPress={() => router.push('/(tabs)/map')}
        />
      </View>

      <Disclaimer>{t('home.disclaimer')}</Disclaimer>
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
    sosBtn: {
      width: 40,
      height: 40,
      borderRadius: 6,
      backgroundColor: colors.dangerLight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    hero: { gap: 4 },
    cardHeadRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    heroKpiLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
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
    quickRow: { flexDirection: 'row', gap: 8 },
    quickBtn: { flex: 1 },
  });
}
