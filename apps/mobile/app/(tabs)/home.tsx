import { Text, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { computeDiaryStats } from '@allerguide/core';
import { getCurrentUser } from '@/src/services/auth-service';
import { confirmLogout } from '@/src/utils/confirm-logout';
import { getDiaryEntries } from '@/src/services/diary-service';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useResponsiveLayout } from '@/src/hooks/use-responsive-layout';

export default function HomeScreen() {
  const theme = useTheme();
  const { gridCardWidth } = useResponsiveLayout();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const currentUser = useMemo(() => getCurrentUser(), []);
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof loadStats>> | null>(null);

  async function loadStats(profileId: number | null) {
    if (!profileId) return null;
    const entries = await getDiaryEntries(profileId);
    return computeDiaryStats(entries);
  }

  useFocusEffect(
    useCallback(() => {
      void loadStats(activeProfileId).then(setStats);
    }, [activeProfileId]),
  );
  const actions = useMemo(
    () =>
      [
        {
          label: 'Дневник',
          desc: 'Записать самочувствие',
          icon: 'journal',
          route: '/(tabs)/diary',
          color: theme.colors.accent,
        },
        {
          label: 'Сканер',
          desc: 'Проверить состав',
          icon: 'scan',
          route: '/(tabs)/scanner',
          color: theme.colors.purple,
        },
        {
          label: 'Маркет',
          desc: 'Товары без аллергенов',
          icon: 'bag',
          route: '/(tabs)/market',
          color: theme.colors.success,
        },
        {
          label: 'Карта',
          desc: 'Безопасные заведения',
          icon: 'map',
          route: '/(tabs)/map',
          color: theme.colors.warning,
        },
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
        <View style={styles.sosBtn}>
          <Pressable onPress={() => router.push('/(tabs)/sos')} style={styles.sosPressable}>
            <Ionicons name="medkit" size={20} color={theme.colors.danger} />
          </Pressable>
        </View>
      </View>

      <ProfileSwitcher />

      <Pressable style={styles.profilesLink} onPress={() => router.push('/profiles')}>
        <Ionicons name="people" size={18} color={theme.colors.accent} />
        <Text style={styles.profilesLinkText}>Управление профилями</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
      </Pressable>

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

      {stats && stats.totalEntries > 0 ? (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Статистика дневника</Text>
          <Text style={styles.statsMeta}>
            {stats.totalEntries} записей · {stats.entriesLast7Days} за 7 дней
          </Text>
          {stats.recentSymptoms.length > 0 ? (
            <Text style={styles.statsLine}>Симптомы: {stats.recentSymptoms.join(' · ')}</Text>
          ) : null}
          {stats.topFoodItems.length > 0 ? (
            <Text style={styles.statsLine}>Питание: {stats.topFoodItems.join(' · ')}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <Ionicons name="shield-checkmark" size={28} color={theme.colors.accent} />
        </View>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>Контроль аллергии</Text>
          <Text style={styles.bannerDesc}>Ведите дневник и сканируйте продукты</Text>
        </View>
      </View>

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

      <Text style={styles.disclaimer}>
        Информация в приложении носит рекомендательный характер.
      </Text>
    </Screen>
  );
}

function createStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    greeting: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
    title: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    sosBtn: { marginTop: 4 },
    sosPressable: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.dangerLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.accentLight,
      borderRadius: 18,
      padding: 16,
      gap: 14,
      borderWidth: 1,
      borderColor: colors.accentMid,
    },
    bannerIcon: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: colors.iconOnCard,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bannerText: { flex: 1, gap: 3 },
    bannerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    bannerDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
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
    statsCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    statsTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    statsMeta: { fontSize: 13, color: colors.textSecondary },
    statsLine: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
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
