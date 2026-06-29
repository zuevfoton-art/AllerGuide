import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
import { downloadBackup, uploadBackup } from '@/src/services/sync-service';
import {
  getStorageMode,
  setStorageMode,
  type StorageMode,
} from '@/src/services/settings-service';
import { useTranslation } from '@/src/store/locale-store';
import { CLOUD_SYNC_ENABLED } from '@/src/constants/features';

export default function SettingsScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [emergencyNumber, setEmergencyNumberState] = useState('103');
  const [syncLoading, setSyncLoading] = useState(false);
  const [storageMode, setStorageModeState] = useState<StorageMode>('cloud');

  useEffect(() => {
    setEmergencyNumberState(getEmergencyNumber());
    setStorageModeState(getStorageMode());
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

  const handleStorageMode = (mode: StorageMode) => {
    setStorageMode(mode);
    setStorageModeState(mode);
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

      <Text style={ui.sectionLabel}>{t('settings.dataStorage')}</Text>
      <GlassCard padded={false}>
        {(
          [
            {
              key: 'local' as StorageMode,
              icon: 'phone-portrait-outline',
              label: t('settings.dataStorageLocal'),
              desc: t('settings.dataStorageLocalDesc'),
              disabled: false,
            },
            {
              key: 'cloud' as StorageMode,
              icon: 'cloud-outline',
              label: t('settings.dataStorageCloud'),
              desc: t('settings.dataStorageCloudDesc'),
              disabled: !CLOUD_SYNC_ENABLED,
            },
          ]
        ).map((opt, idx, arr) => {
          const active = storageMode === opt.key;
          const color = active ? theme.colors.accent : theme.colors.textMuted;
          return (
            <Pressable
              key={opt.key}
              style={[
                styles.storageRow,
                idx < arr.length - 1 && styles.storageRowBorder,
                opt.disabled && styles.storageRowDisabled,
              ]}
              onPress={() => !opt.disabled && handleStorageMode(opt.key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active, disabled: opt.disabled }}>
              <View style={[styles.storageIcon, { backgroundColor: `${color}18` }]}>
                <Ionicons name={opt.icon as 'phone-portrait-outline'} size={18} color={color} />
              </View>
              <View style={styles.storageBody}>
                <Text style={[styles.storageTitle, active && styles.storageTitleActive]}>
                  {opt.label}
                </Text>
                <Text style={styles.storageDesc}>{opt.desc}</Text>
              </View>
              <View style={[styles.radio, active && styles.radioActive]}>
                {active && <View style={styles.radioDot} />}
              </View>
            </Pressable>
          );
        })}
      </GlassCard>

      {storageMode === 'cloud' && CLOUD_SYNC_ENABLED && (
        <>
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
        </>
      )}

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
    storageRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    storageRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    storageRowDisabled: { opacity: 0.4 },
    storageIcon: {
      width: 36,
      height: 36,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    storageBody: { flex: 1, gap: 2 },
    storageTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    storageTitleActive: { color: colors.text },
    storageDesc: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 16,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    radioActive: { borderColor: colors.accent },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.accent,
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
