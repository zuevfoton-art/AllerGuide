import { Alert, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Screen } from '@/src/components/Screen';
import { Ionicons } from '@expo/vector-icons';
import { ThemeToggle } from '@/src/components/ThemeToggle';
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
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View>
          <Text style={styles.title}>{t('settings.title')}</Text>
          <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>{t('settings.emergencyNumber')}</Text>
      <View style={styles.card}>
        <Text style={styles.cardHint}>{t('settings.emergencyHint')}</Text>
        <TextInput
          style={styles.input}
          value={emergencyNumber}
          onChangeText={setEmergencyNumberState}
          placeholder="103"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="phone-pad"
        />
        <Pressable style={styles.primaryBtn} onPress={saveEmergencyNumber}>
          <Text style={styles.primaryBtnText}>{t('settings.saveNumber')}</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>{t('settings.cloudBackup')}</Text>
      <View style={styles.card}>
        <Text style={styles.cardHint}>{t('settings.cloudBackupDesc')}</Text>
        <Pressable style={styles.primaryBtn} disabled={syncLoading} onPress={() => void handleUpload()}>
          <Text style={styles.primaryBtnText}>{t('settings.uploadBackup')}</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} disabled={syncLoading} onPress={() => void handleDownload()}>
          <Text style={styles.secondaryBtnText}>{t('settings.downloadBackup')}</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>{t('settings.reminder')}</Text>
      <View style={styles.card}>
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
      </View>

      <Text style={styles.sectionLabel}>{t('theme.title')}</Text>
      <ThemeToggle />
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
    title: { fontSize: 24, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: 14, color: colors.textSecondary },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      ...(shadows.sm as object),
    },
    cardHint: { fontSize: 13, color: colors.textSecondary },
    input: {
      backgroundColor: colors.bg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
    },
    primaryBtn: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
    },
    primaryBtnText: { color: colors.onAccent, fontWeight: '700' },
    secondaryBtn: {
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      backgroundColor: colors.accentLight,
    },
    secondaryBtnText: { color: colors.accent, fontWeight: '700' },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    switchText: { flex: 1, gap: 4 },
    switchTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    switchHint: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  });
}
