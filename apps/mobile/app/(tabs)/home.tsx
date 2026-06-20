import { Text, Pressable, StyleSheet, View, ActivityIndicator, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { computeDiaryStats } from '@allerguide/core';
import { getDiaryEntries } from '@/src/services/diary-service';
import { fetchWellnessSnapshot, type WellnessSnapshot } from '@/src/services/wellness-service';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { GlassCard } from '@/src/components/GlassCard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

function scoreColor(level: WellnessSnapshot['level'], colors: AppTheme['colors']) {
  if (level === 'good') return colors.teal;
  if (level === 'high-risk') return colors.danger;
  return colors.warning;
}

function factorProgress(level: 'low' | 'mid' | 'high'): number {
  if (level === 'low') return 0.25;
  if (level === 'mid') return 0.55;
  return 0.9;
}

export default function HomeScreen() {
  const theme = useTheme();
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

  const quickLinks = useMemo(
    () =>
      [
        { label: t('tabs.scanner'), icon: 'scan', route: '/(tabs)/scanner' },
        { label: t('tabs.map'), icon: 'map', route: '/(tabs)/map' },
        { label: t('tabs.market'), icon: 'bag', route: '/(tabs)/market' },
        { label: t('home.expert'), icon: 'school', route: '/expert' },
      ] as const,
    [t, locale],
  );

  const pollenFactor = wellness?.factors.find((f) => f.label.toLowerCase().includes(t('home.pollen').toLowerCase()));
  const aqiFactor = wellness?.factors.find((f) => f.label.includes('EAQI'));

  return (
    <Screen>
      <View style={styles.meshTop} pointerEvents="none" />
      <View style={styles.meshBottom} pointerEvents="none" />

      <View style={styles.topBar}>
        <View style={styles.topBarIcons}>
          <View style={styles.chipIcon}>
            <Ionicons name="leaf" size={14} color={theme.colors.teal} />
          </View>
          <View style={styles.chipIcon}>
            <Ionicons name="calendar-outline" size={14} color={theme.colors.textMuted} />
          </View>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/sos')} style={styles.sosBtn}>
          <Ionicons name="medkit" size={18} color={theme.colors.danger} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{t('home.today')}</Text>
        <Text style={styles.heroSub}>
          {profile?.name ? `${t('home.profilePrefix')} · ${profile.name}` : t('home.selectProfile')}
        </Text>
      </View>

      <ProfileSwitcher />

      <GlassCard>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>{t('home.wellnessTitle')}</Text>
          <Pressable onPress={() => router.push('/(tabs)/map')}>
            <Text style={styles.cardLink}>{t('home.details')}</Text>
          </Pressable>
        </View>

        {loadingWellness && !wellness ? (
          <ActivityIndicator color={theme.colors.teal} style={{ marginVertical: 24 }} />
        ) : wellness ? (
          <>
            <View style={styles.gaugeRow}>
              <View style={styles.sideStat}>
                <Text style={styles.sideNum}>{pollenFactor ? '↑' : '—'}</Text>
                <Text style={styles.sideLabel}>{t('home.pollen')}</Text>
              </View>
              <View style={[styles.gauge, { borderColor: scoreColor(wellness.level, theme.colors) }]}>
                <Text style={styles.gaugeNum}>{wellness.score}</Text>
                <Text style={styles.gaugeLabel}>{t('home.index')}</Text>
              </View>
              <View style={styles.sideStat}>
                <Text style={styles.sideNum}>{aqiFactor?.level === 'high' ? '!' : 'OK'}</Text>
                <Text style={styles.sideLabel}>{t('home.air')}</Text>
              </View>
            </View>

            <Text style={styles.statusLine}>{wellness.statusTitle} · {wellness.statusSummary}</Text>

            <View style={styles.macroList}>
              {wellness.factors.slice(0, 3).map((factor) => (
                <View key={factor.label} style={styles.macroRow}>
                  <Text style={styles.macroLabel}>{factor.label.replace(' · Open-Meteo', '').replace(' · EAQI', '')}</Text>
                  <View style={styles.macroTrack}>
                    <View
                      style={[
                        styles.macroFill,
                        {
                          width: `${factorProgress(factor.level) * 100}%`,
                          backgroundColor:
                            factor.level === 'high'
                              ? theme.colors.danger
                              : factor.level === 'mid'
                                ? theme.colors.warning
                                : theme.colors.teal,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.macroValue}>{factor.value}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.statusLine}>{t('home.selectProfile')}</Text>
        )}
      </GlassCard>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{t('home.diary')}</Text>
        <Pressable onPress={() => router.push('/(tabs)/diary')}>
          <Text style={styles.cardLink}>{t('common.more')}</Text>
        </Pressable>
      </View>

      <GlassCard padded={false}>
        {diaryRows.map((row, index) => (
          <Pressable
            key={row.label}
            style={[styles.listRow, index < diaryRows.length - 1 && styles.listRowBorder]}
            onPress={() => router.push(row.route as any)}>
            <View style={styles.listIcon}>
              <Ionicons name={row.icon as any} size={18} color={theme.colors.teal} />
            </View>
            <View style={styles.listBody}>
              <Text style={styles.listTitle}>{row.label} →</Text>
              <Text style={styles.listSub}>{row.sub}</Text>
            </View>
            <View style={styles.addBtn}>
              <Ionicons name="add" size={22} color={theme.colors.text} />
            </View>
          </Pressable>
        ))}
      </GlassCard>

      {wellness?.recommendations[0] ? (
        <GlassCard style={styles.recCard}>
          <Text style={styles.recTitle}>{wellness.recommendations[0].title}</Text>
          <Text style={styles.recText}>{wellness.recommendations[0].text}</Text>
        </GlassCard>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
        {quickLinks.map((item) => (
          <Pressable key={item.label} style={styles.pill} onPress={() => router.push(item.route as any)}>
            <Ionicons name={item.icon as any} size={16} color={theme.colors.teal} />
            <Text style={styles.pillText}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.disclaimer}>{t('home.disclaimer')}</Text>
    </Screen>
  );
}

function createStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
    meshTop: {
      position: 'absolute',
      top: -40,
      right: -30,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: colors.mint,
      opacity: 0.45,
    },
    meshBottom: {
      position: 'absolute',
      top: 120,
      left: -50,
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: colors.foam,
      opacity: 0.8,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    topBarIcons: { flexDirection: 'row', gap: 8 },
    chipIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      ...(shadows.glass as object),
    },
    sosBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.dangerLight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    hero: { gap: 4, marginTop: 4 },
    heroTitle: { fontSize: 34, fontWeight: '800', color: colors.text, letterSpacing: -0.8 },
    heroSub: { fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    cardTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    cardLink: { fontSize: 14, fontWeight: '700', color: colors.teal },
    gaugeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sideStat: { width: 64, alignItems: 'center', gap: 4 },
    sideNum: { fontSize: 20, fontWeight: '800', color: colors.text },
    sideLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
    gauge: {
      width: 112,
      height: 112,
      borderRadius: 56,
      borderWidth: 5,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    gaugeNum: { fontSize: 32, fontWeight: '900', color: colors.text, letterSpacing: -1 },
    gaugeLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
    statusLine: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 14 },
    macroList: { gap: 10 },
    macroRow: { gap: 6 },
    macroLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    macroTrack: {
      height: 6,
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
      overflow: 'hidden',
    },
    macroFill: { height: 6, borderRadius: 999 },
    macroValue: { fontSize: 11, color: colors.textMuted },
    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    listRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    listIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.tealLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listBody: { flex: 1, gap: 2 },
    listTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    listSub: { fontSize: 13, color: colors.textMuted },
    addBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      ...(shadows.glass as object),
    },
    recCard: { gap: 6 },
    recTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    recText: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    pills: { gap: 8, paddingRight: 8 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      ...(shadows.glass as object),
    },
    pillText: { fontSize: 13, fontWeight: '700', color: colors.text },
    disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  });
}
