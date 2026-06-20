import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { parseAllergies } from '@allerguide/core';
import { deleteProfile, listProfiles } from '@/src/services/profile-service';
import { confirmLogout } from '@/src/utils/confirm-logout';
import { Screen } from '@/src/components/Screen';
import { LanguagePicker } from '@/src/components/LanguagePicker';
import { Ionicons } from '@expo/vector-icons';
import { ThemeToggle } from '@/src/components/ThemeToggle';
import { useTranslation } from '@/src/store/locale-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

export default function ProfilesScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState(listProfiles());

  const refresh = useCallback(() => {
    setProfiles(listProfiles());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const confirmDelete = (id: number, name: string) => {
    Alert.alert(t('profiles.deleteTitle'), t('profiles.deleteMessage', { name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteProfile(id);
          refresh();
        },
      },
    ]);
  };

  const openEdit = (id: number) => {
    router.push({ pathname: '/profile-edit', params: { id: String(id) } });
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View>
          <Text style={styles.title}>{t('profiles.title')}</Text>
          <Text style={styles.subtitle}>{t('profiles.subtitle')}</Text>
        </View>
      </View>

      <LanguagePicker />

      {profiles.map((profile) => {
        const allergies = parseAllergies(profile.allergies);
        return (
          <View key={profile.id} style={styles.card}>
            <Pressable style={styles.cardTop} onPress={() => openEdit(profile.id)}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{profile.name?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.name}>{profile.name}</Text>
                <Text style={styles.meta}>
                  {profile.type === 'self' ? t('profiles.self') : t('profiles.child')} · {profile.birthYear}
                </Text>
                <Text style={styles.allergies} numberOfLines={2}>
                  {allergies.join(', ') || t('profiles.noAllergens')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </Pressable>
            <View style={styles.actions}>
              <Pressable style={styles.editBtn} onPress={() => openEdit(profile.id)}>
                <Ionicons name="create-outline" size={16} color={theme.colors.teal} />
                <Text style={styles.editText}>{t('profiles.edit')}</Text>
              </Pressable>
              <Pressable style={styles.deleteBtn} onPress={() => confirmDelete(profile.id, profile.name)}>
                <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                <Text style={styles.deleteText}>{t('profiles.delete')}</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <Pressable style={styles.addBtn} onPress={() => router.push('/profile-setup')}>
        <Ionicons name="add-circle" size={20} color={theme.colors.teal} />
        <Text style={styles.addText}>{t('profiles.add')}</Text>
      </Pressable>

      <ThemeToggle />

      <Pressable style={styles.logoutBtn} onPress={() => confirmLogout(router)}>
        <Ionicons name="log-out-outline" size={18} color={theme.colors.danger} />
        <Text style={styles.logoutText}>{t('profiles.logout')}</Text>
      </Pressable>
    </Screen>
  );
}

function createStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: colors.textSecondary },
    card: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      gap: 14,
      ...(shadows.sm as object),
    },
    cardTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.tealLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontSize: 18, fontWeight: '800', color: colors.teal },
    cardInfo: { flex: 1, gap: 4 },
    name: { fontSize: 17, fontWeight: '700', color: colors.text },
    meta: { fontSize: 13, color: colors.textSecondary },
    allergies: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
    actions: { flexDirection: 'row', gap: 10 },
    editBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.tealLight,
    },
    editText: { color: colors.teal, fontWeight: '700' },
    deleteBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.dangerLight,
    },
    deleteText: { color: colors.danger, fontWeight: '700' },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.teal,
      backgroundColor: colors.tealLight,
    },
    addText: { color: colors.teal, fontWeight: '700', fontSize: 15 },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.dangerLight,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    logoutText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
  });
}
