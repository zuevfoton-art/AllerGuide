import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { parseAllergies } from '@allerguide/core';
import { deleteProfile, listProfiles } from '@/src/services/profile-service';
import { confirmLogout } from '@/src/utils/confirm-logout';
import { Screen } from '@/src/components/Screen';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { LanguagePicker } from '@/src/components/LanguagePicker';
import { ThemeToggle } from '@/src/components/ThemeToggle';
import { Ionicons } from '@expo/vector-icons';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTranslation } from '@/src/store/locale-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

export default function ProfilesScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
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
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={ui.docLabel}>AllerGuide · {t('profiles.eyebrow')}</Text>
          <Text style={ui.docTitle}>{t('profiles.title')}</Text>
          <Text style={ui.docMeta}>{t('profiles.subtitle')}</Text>
        </View>
      </View>

      <GlassCard>
        <Text style={ui.cardTitle}>{t('language.title')}</Text>
        <LanguagePicker embedded />
      </GlassCard>

      <GlassCard padded={false}>
        <View style={styles.listHead}>
          <Text style={[ui.cardTitle, styles.listHeadPad]}>{t('profiles.listTitle')}</Text>
        </View>

        {profiles.length === 0 ? (
          <Text style={[styles.empty, styles.listHeadPad]}>{t('profiles.empty')}</Text>
        ) : (
          profiles.map((profile, index) => {
            const allergies = parseAllergies(profile.allergies);
            const typeLabel = profile.type === 'self' ? t('profiles.self') : t('profiles.child');
            return (
              <View
                key={profile.id}
                style={[styles.row, index < profiles.length - 1 && styles.rowBorder]}>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>
                    {profile.name} · {typeLabel}
                  </Text>
                  <Text style={styles.rowSub}>
                    {profile.birthYear} · {allergies.join(', ') || t('profiles.noAllergens')}
                  </Text>
                </View>
                <View style={styles.rowActions}>
                  <Button
                    label={t('profiles.edit')}
                    variant="secondary"
                    size="sm"
                    onPress={() => openEdit(profile.id)}
                  />
                  <Pressable
                    style={styles.deleteLink}
                    onPress={() => confirmDelete(profile.id, profile.name)}
                    accessibilityRole="button">
                    <Text style={styles.deleteLinkText}>{t('profiles.delete')}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </GlassCard>

      <Button label={t('profiles.add')} variant="primary" block onPress={() => router.push('/profile-setup')} />

      <GlassCard>
        <ThemeToggle embedded />
      </GlassCard>

      <Pressable
        style={styles.logoutBtn}
        onPress={() => confirmLogout(router)}
        accessibilityRole="button">
        <Text style={styles.logoutText}>{t('profiles.logout')}</Text>
      </Pressable>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 6,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 2,
    },
    headerText: { flex: 1, gap: 2 },
    listHead: { paddingTop: 14 },
    listHeadPad: { paddingHorizontal: 16 },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    rowBody: { flex: 1, gap: 3, minWidth: 0 },
    rowTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    rowSub: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
    },
    rowActions: { alignItems: 'flex-end', gap: 6 },
    deleteLink: { paddingVertical: 2, paddingHorizontal: 4, minHeight: 28, justifyContent: 'center' },
    deleteLinkText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.danger,
    },
    empty: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      paddingBottom: 16,
      lineHeight: 18,
    },
    logoutBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    logoutText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.danger,
    },
  });
}
