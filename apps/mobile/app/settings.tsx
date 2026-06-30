import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Screen } from '@/src/components/Screen';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { ThemeToggle } from '@/src/components/ThemeToggle';
import { LegalLinks } from '@/src/components/LegalLinks';
import { Ionicons } from '@expo/vector-icons';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { getEmergencyNumber, setEmergencyNumber } from '@/src/services/sos-service';
import { downloadBackup, uploadBackup } from '@/src/services/sync-service';
import { useTranslation } from '@/src/store/locale-store';

export default function SettingsScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [emergencyNumber, setEmergencyNumberState] = useState('103');
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    setEmergencyNumberState(getEmergencyNumber());
  }, []);

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
          <Text style={ui.docLabel}>AllerGuide · {t('settings.eyebrow')}</Text>
          <Text style={ui.docTitle}>{t('settings.title')}</Text>
          <Text style={ui.docMeta}>{t('settings.subtitle')}</Text>
        </View>
      </View>

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

      <Text style={ui.sectionLabel}>{t('settings.account')}</Text>
      <GlassCard>
        <Text style={styles.cardHint}>{t('settings.manageProfilesHint')}</Text>
        <Button
          label={t('settings.manageProfiles')}
          variant="secondary"
          block
          onPress={() => router.push('/profile' as any)}
        />
      </GlassCard>

      <Text style={ui.sectionLabel}>{t('theme.title')}</Text>
      <ThemeToggle />

      <LegalLinks />
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
    cardHint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 10,
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
  });
}
