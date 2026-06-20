import { Text, Pressable, StyleSheet, View, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { computeDiaryStats } from '@allerguide/core';
import { getCurrentUser } from '@/src/services/auth-service';
import { confirmLogout } from '@/src/utils/confirm-logout';
import { getDiaryEntries } from '@/src/services/diary-service';
import { fetchWellnessSnapshot, type WellnessSnapshot } from '@/src/services/wellness-service';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useResponsiveLayout } from '@/src/hooks/use-responsive-layout';

function scoreColor(level: WellnessSnapshot['level'], colors: AppTheme['colors']) {
  if (level === 'good') return colors.success;
  if (level === 'high-risk') return colors.danger;
  return colors.warning;
}

export default function HomeScreen() {
  const theme = useTheme();
  const { gridCardWidth } = useResponsiveLayout();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const currentUser = useMemo(() => getCurrentUser(), []);
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
      });
      setWellness(snapshot);
    } finally {
      setLoadingWellness(false);
    }
  }, [activeProfileId, profile]);

  useFocusEffect(
    useCallback(() => {
      void loadWellness();
    }, [loadWellness]),
  );

  const actions = useMemo(
    () =>
      [
        { label: 'Дневник', desc: 'Записать самочувствие', icon: 'journal', route: '/(tabs)/diary', color: theme.colors.accent },
        { label: 'Сканер', desc: 'Проверить состав', icon: 'scan', route: '/(tabs)/scanner', color: theme.colors.purple },
        { label: 'Маркет', desc: 'Товары без аллергенов', icon: 'bag', route: '/(tabs)/market', color: theme.colors.success },
        { label: 'Карта', desc: 'Места и пыление', icon: 'map', route: '/(tabs)/map', color: theme.colors.warning },
        { label: 'Эксперт', desc: 'Проф. Смолкин Ю.С.', icon: 'school', route: '/expert', color: theme.colors.pink },
      ] as const,
    [theme],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Добро пожаловать 👋</Text>
          <Text style={styles.title}>AllerGuide</Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/sos')} style={styles.sosPressable}>
          <Ionicons name="medkit" size={20} color={theme.colors.danger} />
        </Pressable>
      </View>

      <ProfileSwitcher />

      <Text style={styles.sectionLabel}>Самочувствие сегодня</Text>
      <View style={styles.wellnessCard}>
        {loadingWellness && !wellness ? (
          <ActivityIndicator color={theme.colors.accent} />
        ) : wellness ? (
          <>
            <View style={styles.wellnessHead}>
              <View style={[styles.scoreCircle, { borderColor: scoreColor(wellness.level, theme.colors) }]}>
                <Text style={styles.scoreNum}>{wellness.score}</Text>
                <Text style={styles.scoreOf}>из 100</Text>
              </View>
              <View style={styles.wellnessText}>
                <Text style={styles.wellnessTitle}>{wellness.statusTitle}</Text>
                <Text style={styles.wellnessSummary}>{wellness.statusSummary}</Text>
                <Text style={styles.wellnessMeta}>{wellness.locationLabel} · Open-Meteo</Text>
              </View>
            </View>
            {wellness.factors.map((factor) => (
              <View key={factor.label} style={styles.factorRow}>
                <Text style={styles.factorLabel}>{factor.label}</Text>
                <Text style={styles.factorValue}>{factor.value}</Text>
              </View>
            ))}
            {wellness.recommendations.slice(0, 2).map((rec) => (
              <View key={rec.title} style={styles.recRow}>
                <Text style={styles.recTitle}>{rec.title}</Text>
                <Text style={styles.recText}>{rec.text}</Text>
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.wellnessSummary}>Выберите профиль для расчёта индекса.</Text>
        )}
      </View>

      <Pressable style={styles.profilesLink} onPress={() => router.push('/profiles')}>
        <Ionicons name="people" size={18} color={theme.colors.accent} />
        <Text style={styles.profilesLinkText}>Управление профилями</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
      </Pressable>

      <Text style={styles.sectionLabel}>Быстрые действия</Text>
      <View style={styles.grid}>
        {actions.map((item) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [styles.actionCard, { width: gridCardWidth }, pressed && styles.pressed]}
            onPress={() => router.push(item.route as any)}>
            <View style={[styles.actionIcon, { backgroundColor: `${item.color}18` }]}>
              <Ionicons name={item.icon as any} size={24} color={item.color} />
            </View>
            <Text style={styles.actionLabel}>{item.label}</Text>
            <Text style={styles.actionDesc}>{item.desc}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.accountBlock}>
        <View style={styles.accountInfo}>
          <Ionicons name="person-circle-outline" size={22} color={theme.colors.accent} />
          <View style={styles.accountTextWrap}>
            <Text style={styles.accountLabel}>Аккаунт</Text>
            <Text style={styles.accountLogin}>{currentUser?.login ?? 'Не авторизован'}</Text>
          </View>
        </View>
        <Pressable style={styles.logoutBtn} onPress={() => confirmLogout(router)}>
          <Ionicons name="log-out-outline" size={16} color={theme.colors.danger} />
          <Text style={styles.logoutText}>Выйти</Text>
        </Pressable>
      </View>

      <Text style={styles.disclaimer}>
        Индекс носит рекомендательный характер и не заменяет консультацию аллерголога.
      </Text>
    </Screen>
  );
}

function createStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    greeting: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
    title: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    sosPressable: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.dangerLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    wellnessCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.mint,
      gap: 10,
      ...(shadows.sm as object),
    },
    wellnessHead: { flexDirection: 'row', gap: 14, alignItems: 'center' },
    scoreCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scoreNum: { fontSize: 22, fontWeight: '900', color: colors.text },
    scoreOf: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
    wellnessText: { flex: 1, gap: 4 },
    wellnessTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
    wellnessSummary: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    wellnessMeta: { fontSize: 11, color: colors.textMuted },
    factorRow: {
      backgroundColor: colors.bg,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    factorLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
    factorValue: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 2 },
    recRow: {
      backgroundColor: colors.tipBg,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.tipBorder,
    },
    recTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
    recText: { fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginTop: 2 },
    profilesLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    profilesLinkText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
    accountBlock: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    accountInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    accountTextWrap: { flex: 1, gap: 2 },
    accountLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    accountLogin: { fontSize: 15, fontWeight: '600', color: colors.text },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.dangerLight,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    logoutText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: -4,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    actionCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      gap: 10,
      ...(shadows.sm as object),
    },
    pressed: { opacity: 0.82 },
    actionIcon: {
      width: 46,
      height: 46,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
    actionDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 16 },
    disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  });
}
