import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { parseAllergies, type Profile } from '@allerguide/core';
import { listProfiles } from '@/src/services/profile-service';
import { confirmDeleteAccount } from '@/src/utils/confirm-delete-account';
import { confirmLogout } from '@/src/utils/confirm-logout';
import { Screen } from '@/src/components/Screen';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { LanguagePicker } from '@/src/components/LanguagePicker';
import { ThemeToggle } from '@/src/components/ThemeToggle';
import { Ionicons } from '@expo/vector-icons';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTranslation } from '@/src/store/locale-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { getEmergencyNumber, setEmergencyNumber } from '@/src/services/sos-service';
import { CloudBackupCard } from '@/src/components/CloudBackupCard';
import { LocalBackupCard } from '@/src/components/LocalBackupCard';
import { RecoveryKeyBanner } from '@/src/components/RecoveryKeyBanner';
import {
  canUseBiometricLock,
  isAppLockEnabled,
  setAppLockEnabled,
} from '@/src/services/app-lock-service';

export default function ProfileScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [emergencyNumber, setEmergencyNumberState] = useState('103');
  const [appLockAvailable, setAppLockAvailable] = useState(false);

  const refresh = useCallback(() => {
    setProfiles(listProfiles());
    setEmergencyNumberState(getEmergencyNumber());
    void canUseBiometricLock().then(setAppLockAvailable);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const openEdit = (id: number) => {
    router.push({ pathname: '/profile-edit', params: { id: String(id) } });
  };

  const saveEmergencyNumber = () => {
    const normalized = emergencyNumber.replace(/[^\d+]/g, '') || '103';
    setEmergencyNumber(normalized);
    setEmergencyNumberState(normalized);
    Alert.alert(t('settings.saved'), t('settings.savedNumberMessage', { number: normalized }));
  };

  return (
    <Screen>
      <ScreenHeader
        onBack={() => router.back()}
        title={t('profiles.title')}
        subtitle={t('profiles.subtitle')}
        right={<LanguagePicker header />}
        titleTestID="profile-screen-title"
      />

      <Text style={ui.sectionLabel}>{t('profiles.listTitle')}</Text>
      <GlassCard padded={false}>
        {profiles.length === 0 ? (
          <Text style={[styles.empty, styles.listHeadPad]}>{t('profiles.empty')}</Text>
        ) : (
          profiles.map((profile, index) => {
            const allergies = parseAllergies(profile.allergies);
            const typeLabel = profile.type === 'self' ? t('profiles.self') : t('profiles.child');
            return (
              <Pressable
                key={profile.id}
                testID={`profile-row-${index}`}
                style={[styles.row, index < profiles.length - 1 && styles.rowBorder]}
                onPress={() => openEdit(profile.id)}
                accessibilityRole="button"
                accessibilityLabel={`${profile.name}, ${t('common.edit')}`}>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>
                    {profile.name} · {typeLabel}
                  </Text>
                  <Text style={styles.rowSub}>
                    {profile.birthYear} · {allergies.join(', ') || t('profiles.noAllergens')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
              </Pressable>
            );
          })
        )}
      </GlassCard>
      <Button label={t('profiles.add')} variant="primary" block onPress={() => router.push('/profile-setup?mode=add')} />

      <Text style={ui.sectionLabel}>{t('sos.title')}</Text>
      <GlassCard>
        <Text style={styles.cardHint}>{t('sos.subtitle')}</Text>
        <Button
          label={t('profiles.sosPassport')}
          variant="secondary"
          block
          onPress={() => router.push('/sos-edit' as any)}
        />
        <Button
          label={t('profiles.sosContacts')}
          variant="secondary"
          block
          onPress={() => router.push('/sos-edit' as any)}
        />
      </GlassCard>

      <Text style={ui.sectionLabel}>{t('settings.emergencyNumber')}</Text>
      <GlassCard>
        <Text style={styles.cardHint}>{t('settings.emergencyHint')}</Text>
        <TextInput
          testID="profile-emergency-number"
          style={styles.input}
          value={emergencyNumber}
          onChangeText={setEmergencyNumberState}
          placeholder="103"
          placeholderTextColor={theme.colors.textMuted}
          accessibilityLabel={t('settings.emergencyNumber')}
          keyboardType="phone-pad"
        />
        <Button
          testID="profile-save-number"
          label={t('settings.saveNumber')}
          variant="primary"
          block
          onPress={saveEmergencyNumber}
        />
      </GlassCard>

      <Text style={ui.sectionLabel}>{t('settings.backup')}</Text>
      <RecoveryKeyBanner />
      <LocalBackupCard />

      <Text style={ui.sectionLabel}>{t('settings.cloudBackup')}</Text>
      <CloudBackupCard />

      {appLockAvailable ? (
        <>
          <Text style={ui.sectionLabel}>{t('settings.appLockTitle')}</Text>
          <GlassCard>
            <Text style={styles.cardHint}>{t('settings.appLockHint')}</Text>
            <Button
              label={isAppLockEnabled() ? t('settings.appLockDisable') : t('settings.appLockEnable')}
              variant="secondary"
              block
              onPress={() => setAppLockEnabled(!isAppLockEnabled())}
            />
          </GlassCard>
        </>
      ) : null}

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

      <Text style={ui.sectionLabel}>{t('settings.aboutTitle')}</Text>
      <GlassCard padded={false}>
        <Pressable
          style={styles.hubRow}
          onPress={() => router.push('/about' as any)}
          accessibilityRole="button"
          accessibilityLabel={t('settings.aboutTitle')}>
          <View style={styles.hubIcon}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.accent} />
          </View>
          <View style={styles.hubBody}>
            <Text style={styles.hubTitle}>{t('settings.aboutTitle')}</Text>
            <Text style={styles.hubHint}>{t('settings.aboutHint')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </Pressable>
      </GlassCard>

      <Text style={ui.sectionLabel}>{t('profiles.accountTitle')}</Text>
      <GlassCard>
        <Text style={styles.accountHint}>{t('profiles.accountHint')}</Text>
        <Pressable
          testID="profile-logout"
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
    listHeadPad: { paddingHorizontal: 16, paddingVertical: 16 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
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
