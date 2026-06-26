import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { parseAllergies } from '@allerguide/core';
import { deleteProfile, listProfiles } from '@/src/services/profile-service';
import { confirmDeleteAccount } from '@/src/utils/confirm-delete-account';
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
import { getEmergencyNumber, setEmergencyNumber } from '@/src/services/sos-service';
import { downloadBackup, uploadBackup } from '@/src/services/sync-service';
import type { Profile } from '@/src/types';

export default function ProfileScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [emergencyNumber, setEmergencyNumberState] = useState('103');
  const [syncLoading, setSyncLoading] = useState(false);

  const refresh = useCallback(() => {
    setProfiles(listProfiles());
    setEmergencyNumberState(getEmergencyNumber());
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

  const saveEmergencyNumber = () => {
    const normalized = emergencyNumber.replace(/[^\d+]/g, '') || '103';
    setEmergencyNumber(normalized);
    setEmergencyNumberState(normalized);
    Alert.alert(t('settings.saved'), t('settings.savedNumberMessage', { number: normalized }));
  };

  const handleUpload = async () => {
    setSyncLoading(true);
    try {
      const result = await uploadBackup();
      Alert.alert(
        result.ok ? t('settings.syncSuccess') : t('settings.syncError'),
        result.ok ? t('settings.uploadSuccess') : result.error ?? t('common.error'),
      );
    } finally {
      setSyncLoading(false);
    }
  };

  const handleDownload = async () => {
    setSyncLoading(true);
    try {
      const result = await downloadBackup();
      Alert.alert(
        result.ok ? t('settings.syncSuccess') : t('settings.syncError'),
        result.ok ? t('settings.downloadSuccess') : result.error ?? t('common.error'),
      );
    } finally {
      setSyncLoading(false);
    }
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
        <LanguagePicker header />
      </View>

      <Text style={ui.sectionLabel}>{t('profiles.listTitle')}</Text>
      <GlassCard padded={false}>
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
      <Button label={t('profiles.add')} variant="primary" block onPress={() => router.push('/profile-setup?mode=add')} />

      <Text style={ui.sectionLabel}>{t('settings.emergencyNumber')}</Text>
      <GlassCard>
        <Text style={styles.cardHint}>{t('settings.emergencyHint')}</Text>
        <TextInput
          style={styles.input}
          value={emergencyNumber}
          onChangeText={setEmergencyNumberState}
          placeholder="103"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="phone-pad"
        />
        <Button label={t('settings.saveNumber')} variant="primary" block onPress={saveEmergencyNumber} />
      </GlassCard>

      <Text style={ui.sectionLabel}>{t('settings.cloudBackup')}</Text>
      <GlassCard>
        <Text style={styles.cardHint}>{t('settings.cloudBackupDesc')}</Text>
        <Button
          label={t('settings.uploadBackup')}
          variant="primary"
          block
          disabled={syncLoading}
          onPress={() => void handleUpload()}
        />
        <Button
          label={t('settings.downloadBackup')}
          variant="secondary"
          block
          disabled={syncLoading}
          onPress={() => void handleDownload()}
        />
      </GlassCard>

      <Text style={ui.sectionLabel}>{t('notifications.hubTitle')}</Text>
      <GlassCard padded={false}>
        <Pressable
          style={styles.hubRow}
          onPress={() => router.push('/notifications' as any)}
          accessibilityRole="button"
          accessibilityLabel={t('notifications.hubTitle')}>
          <View style={styles.hubIcon}>
            <Ionicons name="notifications-outline" size={20} color={theme.colors.accent} />
          </View>
          <View style={styles.hubBody}>
            <Text style={styles.hubTitle}>{t('notifications.hubTitle')}</Text>
            <Text style={styles.hubHint}>{t('notifications.hubHint')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </Pressable>
      </GlassCard>

      <Text style={ui.sectionLabel}>{t('theme.title')}</Text>
      <ThemeToggle />

      <Text style={ui.sectionLabel}>{t('profiles.accountTitle')}</Text>
      <GlassCard>
        <Text style={styles.accountHint}>{t('profiles.accountHint')}</Text>
        <Pressable
          style={styles.accountBtn}
          onPress={() => confirmLogout(router)}
          accessibilityRole="button">
          <Text style={styles.logoutText}>{t('profiles.logout')}</Text>
        </Pressable>
        <Pressable
          style={styles.deleteAccountBtn}
          onPress={() => confirmDeleteAccount(router)}
          accessibilityRole="button">
          <Text style={styles.deleteAccountText}>{t('profiles.deleteAccount')}</Text>
        </Pressable>
      </GlassCard>
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
      flexShrink: 0,
    },
    headerText: { flex: 1, gap: 2, minWidth: 0 },
    listHeadPad: { paddingHorizontal: 16, paddingVertical: 16 },
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
      lineHeight: 18,
    },
    cardHint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.borderInput,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: fonts.sans,
      color: colors.text,
      marginBottom: 10,
    },
    hubRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    hubIcon: {
      width: 40,
      height: 40,
      borderRadius: 6,
      backgroundColor: colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hubBody: { flex: 1, gap: 3 },
    hubTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    hubHint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    accountHint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 12,
    },
    accountBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      marginBottom: 10,
    },
    deleteAccountBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    logoutText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.danger,
    },
    deleteAccountText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.danger,
    },
  });
}
