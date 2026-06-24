import { Alert, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Screen } from '@/src/components/Screen';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { ThemeToggle } from '@/src/components/ThemeToggle';
import { Ionicons } from '@expo/vector-icons';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { getEmergencyNumber, setEmergencyNumber } from '@/src/services/sos-service';
import {
  isDiaryReminderEnabled,
  syncDiaryReminder,
} from '@/src/services/notification-service';
import { downloadBackup, uploadBackup } from '@/src/services/sync-service';
import { useTranslation } from '@/src/store/locale-store';

export default function SettingsScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [emergencyNumber, setEmergencyNumberState] = useState('103');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    setEmergencyNumberState(getEmergencyNumber());
    setReminderEnabled(isDiaryReminderEnabled());
  }, []);

  const saveEmergencyNumber = () => {
    const normalized = emergencyNumber.replace(/[^\d+]/g, '') || '103';
    setEmergencyNumber(normalized);
    setEmergencyNumberState(normalized);
    Alert.alert(t('settings.saved'), t('settings.savedNumberMessage', { number: normalized }));
  };

  const toggleReminder = async (value: boolean) => {
    if (Platform.OS === 'web') {
      Alert.alert(t('settings.unavailable'), t('settings.reminderWeb'));
      return;
    }

    setReminderLoading(true);
    try {
      const ok = await syncDiaryReminder(value);
      if (!ok && value) {
        Alert.alert(t('settings.unavailable'), t('settings.reminderDenied'));
        setReminderEnabled(false);
        return;
      }
      setReminderEnabled(value);
    } finally {
      setReminderLoading(false);
    }
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

      <Text style={ui.sectionLabel}>{t('settings.reminder')}</Text>
      <GlassCard>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>{t('settings.reminderTitle')}</Text>
            <Text style={styles.switchHint}>{t('settings.reminderHint')}</Text>
          </View>
          <Switch
            value={reminderEnabled}
            onValueChange={(value) => void toggleReminder(value)}
            disabled={reminderLoading}
            trackColor={{ false: theme.colors.border, true: theme.colors.accentMid }}
            thumbColor={reminderEnabled ? theme.colors.accent : theme.colors.card}
          />
        </View>
      </GlassCard>

      <Text style={ui.sectionLabel}>{t('settings.account')}</Text>
      <GlassCard>
        <Text style={styles.cardHint}>{t('settings.manageProfilesHint')}</Text>
        <Button
          label={t('settings.manageProfiles')}
          variant="secondary"
          block
          onPress={() => router.push('/profiles')}
        />
      </GlassCard>

      <Text style={ui.sectionLabel}>{t('theme.title')}</Text>
      <ThemeToggle />
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
    },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    switchText: { flex: 1, gap: 4 },
    switchTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    switchHint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
}
