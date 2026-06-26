import { Alert, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { formatReminderClock } from '@allerguide/core';
import { Screen } from '@/src/components/Screen';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { getDiaryReminderNotificationContent } from '@/src/services/notification-content-service';
import { listAllDiaryEntries } from '@/src/services/diary-service';
import { reconcileAllReminders } from '@/src/services/reminder-reconcile-service';
import {
  getDiaryReminderHour,
  getDiaryReminderMinute,
  getNotificationPermissionStatus,
  getPollenReminderHour,
  getPollenReminderMinute,
  getPollenReminderThreshold,
  isActReminderEnabled,
  isDiaryReminderEnabled,
  isEpinephrineReminderEnabled,
  isPollenReminderEnabled,
  isQuietHoursEnabled,
  isVisitReminderEnabled,
  openNotificationSettings,
  requestNotificationPermission,
  sendDiaryReminderPreview,
  setActReminderEnabled,
  setDiaryReminderTime,
  setEpinephrineReminderEnabled,
  setPollenReminderEnabled,
  setPollenReminderThreshold,
  setPollenReminderTime,
  setQuietHoursEnabled,
  setVisitReminderEnabled,
  syncDiaryReminder,
  type NotificationPermissionStatus,
  type PollenReminderThreshold,
} from '@/src/services/notification-service';

export default function NotificationsScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const isWeb = Platform.OS === 'web';

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [actEnabled, setActEnabled] = useState(false);
  const [visitEnabled, setVisitEnabled] = useState(false);
  const [epiEnabled, setEpiEnabled] = useState(false);
  const [quietHoursEnabled, setQuietHoursEnabledState] = useState(true);
  const [pollenEnabled, setPollenEnabled] = useState(false);
  const [pollenHour, setPollenHour] = useState('7');
  const [pollenMinute, setPollenMinute] = useState('30');
  const [pollenThreshold, setPollenThresholdState] = useState<PollenReminderThreshold>('high');
  const [reminderHour, setReminderHour] = useState('20');
  const [reminderMinute, setReminderMinute] = useState('00');
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>('undetermined');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setReminderEnabled(isDiaryReminderEnabled());
    setActEnabled(isActReminderEnabled());
    setVisitEnabled(isVisitReminderEnabled());
    setEpiEnabled(isEpinephrineReminderEnabled());
    setQuietHoursEnabledState(isQuietHoursEnabled());
    setPollenEnabled(isPollenReminderEnabled());
    setPollenHour(String(getPollenReminderHour()));
    setPollenMinute(String(getPollenReminderMinute()).padStart(2, '0'));
    setPollenThresholdState(getPollenReminderThreshold());
    setReminderHour(String(getDiaryReminderHour()));
    setReminderMinute(String(getDiaryReminderMinute()).padStart(2, '0'));
    setPermissionStatus(await getNotificationPermissionStatus());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const reminderTimeLabel = useMemo(() => {
    const hour = Number(reminderHour);
    const minute = Number(reminderMinute);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return '';
    return t('notifications.diaryAt', { time: formatReminderClock(hour, minute) });
  }, [reminderHour, reminderMinute, t]);

  const pollenTimeLabel = useMemo(() => {
    const hour = Number(pollenHour);
    const minute = Number(pollenMinute);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return '';
    return t('notifications.pollenAt', { time: formatReminderClock(hour, minute) });
  }, [pollenHour, pollenMinute, t]);

  const permissionLabel = useMemo(() => {
    if (permissionStatus === 'web-unavailable') return t('notifications.permissionWeb');
    if (permissionStatus === 'granted') return t('notifications.permissionGranted');
    if (permissionStatus === 'denied') return t('notifications.permissionDenied');
    return t('notifications.permissionUndetermined');
  }, [permissionStatus, t]);

  const persistTime = (hourRaw: string, minuteRaw: string) => {
    const hour = Number(hourRaw.replace(/\D/g, ''));
    const minute = Number(minuteRaw.replace(/\D/g, ''));
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return;
    setDiaryReminderTime(hour, minute);
  };

  const persistPollenTime = (hourRaw: string, minuteRaw: string) => {
    const hour = Number(hourRaw.replace(/\D/g, ''));
    const minute = Number(minuteRaw.replace(/\D/g, ''));
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return;
    setPollenReminderTime(hour, minute);
  };

  const savePollenTimeAndReschedule = async () => {
    if (isWeb) return;

    persistPollenTime(pollenHour, pollenMinute);
    if (!pollenEnabled) return;

    setLoading(true);
    try {
      await reconcileAllReminders();
      setPermissionStatus(await getNotificationPermissionStatus());
    } finally {
      setLoading(false);
    }
  };

  const togglePollenThreshold = async (threshold: PollenReminderThreshold) => {
    if (isWeb) return;

    setPollenThresholdState(threshold);
    setPollenReminderThreshold(threshold);
    if (pollenEnabled) {
      setLoading(true);
      try {
        await reconcileAllReminders();
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleReminder = async (value: boolean) => {
    if (isWeb) return;

    setLoading(true);
    try {
      const content = getDiaryReminderNotificationContent();
      const ok = await syncDiaryReminder(value, content, listAllDiaryEntries());
      if (!ok && value) {
        Alert.alert(t('notifications.unavailable'), t('notifications.denied'));
        setReminderEnabled(false);
        setPermissionStatus(await getNotificationPermissionStatus());
        return;
      }
      setReminderEnabled(value);
      setPermissionStatus(await getNotificationPermissionStatus());
    } finally {
      setLoading(false);
    }
  };

  const saveTimeAndReschedule = async () => {
    if (isWeb) return;

    persistTime(reminderHour, reminderMinute);
    if (!reminderEnabled) return;

    setLoading(true);
    try {
      const content = getDiaryReminderNotificationContent();
      const ok = await syncDiaryReminder(true, content, listAllDiaryEntries());
      if (!ok) {
        Alert.alert(t('notifications.unavailable'), t('notifications.denied'));
        setReminderEnabled(false);
      }
      setPermissionStatus(await getNotificationPermissionStatus());
    } finally {
      setLoading(false);
    }
  };

  const toggleClinical = async (
    value: boolean,
    setter: (next: boolean) => void,
    persist: (next: boolean) => void,
  ) => {
    if (isWeb) return;

    setLoading(true);
    try {
      if (value) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          Alert.alert(t('notifications.unavailable'), t('notifications.denied'));
          setter(false);
          setPermissionStatus(await getNotificationPermissionStatus());
          return;
        }
      }
      persist(value);
      setter(value);
      await reconcileAllReminders();
      setPermissionStatus(await getNotificationPermissionStatus());
    } finally {
      setLoading(false);
    }
  };

  const previewReminder = async () => {
    if (isWeb) return;

    setLoading(true);
    try {
      const ok = await sendDiaryReminderPreview(getDiaryReminderNotificationContent());
      if (!ok) {
        Alert.alert(t('notifications.unavailable'), t('notifications.denied'));
        setPermissionStatus(await getNotificationPermissionStatus());
        return;
      }
      Alert.alert(t('settings.saved'), t('notifications.previewSent'));
      setPermissionStatus(await getNotificationPermissionStatus());
    } finally {
      setLoading(false);
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
          <Text style={ui.docLabel}>AllerGuide · {t('notifications.eyebrow')}</Text>
          <Text style={ui.docTitle}>{t('notifications.title')}</Text>
          <Text style={ui.docMeta}>{t('notifications.subtitle')}</Text>
        </View>
      </View>

      <Text style={ui.sectionLabel}>{t('notifications.permissionTitle')}</Text>
      <GlassCard>
        <Text style={styles.statusText}>{permissionLabel}</Text>
        {!isWeb && permissionStatus !== 'granted' ? (
          <Button
            label={t('notifications.openSettings')}
            variant="secondary"
            block
            onPress={openNotificationSettings}
          />
        ) : null}
        {isWeb ? <Text style={styles.hint}>{t('notifications.webOnly')}</Text> : null}
      </GlassCard>

      <Text style={ui.sectionLabel}>{t('notifications.diarySection')}</Text>
      <GlassCard>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>{t('notifications.diaryTitle')}</Text>
            <Text style={styles.switchHint}>
              {reminderEnabled && reminderTimeLabel
                ? reminderTimeLabel
                : t('notifications.diaryHint')}
            </Text>
            <Text style={styles.microHint}>{t('notifications.diarySkipHint')}</Text>
          </View>
          <Switch
            value={reminderEnabled}
            onValueChange={(value) => void toggleReminder(value)}
            disabled={loading || isWeb}
            trackColor={{ false: theme.colors.border, true: theme.colors.accentMid }}
            thumbColor={reminderEnabled ? theme.colors.accent : theme.colors.card}
          />
        </View>

        {!isWeb ? (
          <>
            <Text style={[ui.sectionLabel, styles.timeLabel]}>{t('notifications.diaryTimeLabel')}</Text>
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.timeFieldLabel}>{t('notifications.diaryHour')}</Text>
                <TextInput
                  style={styles.input}
                  value={reminderHour}
                  onChangeText={(value) => {
                    const next = value.replace(/\D/g, '').slice(0, 2);
                    setReminderHour(next);
                  }}
                  onBlur={() => void saveTimeAndReschedule()}
                  keyboardType="number-pad"
                  maxLength={2}
                  editable={!loading}
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <View style={styles.timeField}>
                <Text style={styles.timeFieldLabel}>{t('notifications.diaryMinute')}</Text>
                <TextInput
                  style={styles.input}
                  value={reminderMinute}
                  onChangeText={(value) => {
                    const next = value.replace(/\D/g, '').slice(0, 2);
                    setReminderMinute(next);
                  }}
                  onBlur={() => void saveTimeAndReschedule()}
                  keyboardType="number-pad"
                  maxLength={2}
                  editable={!loading}
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>
            <Button
              label={t('notifications.preview')}
              variant="secondary"
              block
              disabled={loading}
              onPress={() => void previewReminder()}
            />
          </>
        ) : null}
      </GlassCard>

      <Text style={ui.sectionLabel}>{t('notifications.clinicalSection')}</Text>
      <GlassCard>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>{t('notifications.actTitle')}</Text>
            <Text style={styles.switchHint}>{t('notifications.actHint')}</Text>
          </View>
          <Switch
            value={actEnabled}
            onValueChange={(value) => void toggleClinical(value, setActEnabled, setActReminderEnabled)}
            disabled={loading || isWeb}
            trackColor={{ false: theme.colors.border, true: theme.colors.accentMid }}
            thumbColor={actEnabled ? theme.colors.accent : theme.colors.card}
          />
        </View>
        <View style={[styles.switchRow, styles.switchGap]}>
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>{t('notifications.visitTitle')}</Text>
            <Text style={styles.switchHint}>{t('notifications.visitHint')}</Text>
          </View>
          <Switch
            value={visitEnabled}
            onValueChange={(value) => void toggleClinical(value, setVisitEnabled, setVisitReminderEnabled)}
            disabled={loading || isWeb}
            trackColor={{ false: theme.colors.border, true: theme.colors.accentMid }}
            thumbColor={visitEnabled ? theme.colors.accent : theme.colors.card}
          />
        </View>
        <View style={[styles.switchRow, styles.switchGap]}>
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>{t('notifications.epiTitle')}</Text>
            <Text style={styles.switchHint}>{t('notifications.epiHint')}</Text>
          </View>
          <Switch
            value={epiEnabled}
            onValueChange={(value) => void toggleClinical(value, setEpiEnabled, setEpinephrineReminderEnabled)}
            disabled={loading || isWeb}
            trackColor={{ false: theme.colors.border, true: theme.colors.accentMid }}
            thumbColor={epiEnabled ? theme.colors.accent : theme.colors.card}
          />
        </View>
      </GlassCard>

      <Text style={ui.sectionLabel}>{t('notifications.environmentSection')}</Text>
      <GlassCard>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>{t('notifications.pollenTitle')}</Text>
            <Text style={styles.switchHint}>
              {pollenEnabled && pollenTimeLabel
                ? pollenTimeLabel
                : t('notifications.pollenHint')}
            </Text>
            <Text style={styles.microHint}>{t('notifications.pollenCacheHint')}</Text>
          </View>
          <Switch
            value={pollenEnabled}
            onValueChange={(value) => void toggleClinical(value, setPollenEnabled, setPollenReminderEnabled)}
            disabled={loading || isWeb}
            trackColor={{ false: theme.colors.border, true: theme.colors.accentMid }}
            thumbColor={pollenEnabled ? theme.colors.accent : theme.colors.card}
          />
        </View>

        {!isWeb ? (
          <>
            <Text style={[ui.sectionLabel, styles.timeLabel]}>{t('notifications.pollenTimeLabel')}</Text>
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.timeFieldLabel}>{t('notifications.pollenHour')}</Text>
                <TextInput
                  style={styles.input}
                  value={pollenHour}
                  onChangeText={(value) => {
                    const next = value.replace(/\D/g, '').slice(0, 2);
                    setPollenHour(next);
                  }}
                  onBlur={() => void savePollenTimeAndReschedule()}
                  keyboardType="number-pad"
                  maxLength={2}
                  editable={!loading}
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <View style={styles.timeField}>
                <Text style={styles.timeFieldLabel}>{t('notifications.pollenMinute')}</Text>
                <TextInput
                  style={styles.input}
                  value={pollenMinute}
                  onChangeText={(value) => {
                    const next = value.replace(/\D/g, '').slice(0, 2);
                    setPollenMinute(next);
                  }}
                  onBlur={() => void savePollenTimeAndReschedule()}
                  keyboardType="number-pad"
                  maxLength={2}
                  editable={!loading}
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>
            <Text style={[ui.sectionLabel, styles.timeLabel]}>{t('notifications.pollenThresholdLabel')}</Text>
            <View style={styles.thresholdRow}>
              <Pressable
                style={[styles.thresholdBtn, pollenThreshold === 'high' && styles.thresholdBtnActive]}
                onPress={() => void togglePollenThreshold('high')}
                disabled={loading}>
                <Text
                  style={[
                    styles.thresholdBtnText,
                    pollenThreshold === 'high' && styles.thresholdBtnTextActive,
                  ]}>
                  {t('notifications.pollenThresholdHigh')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.thresholdBtn, pollenThreshold === 'moderate' && styles.thresholdBtnActive]}
                onPress={() => void togglePollenThreshold('moderate')}
                disabled={loading}>
                <Text
                  style={[
                    styles.thresholdBtnText,
                    pollenThreshold === 'moderate' && styles.thresholdBtnTextActive,
                  ]}>
                  {t('notifications.pollenThresholdModerate')}
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </GlassCard>

      <Text style={ui.sectionLabel}>{t('notifications.quietHoursTitle')}</Text>
      <GlassCard>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>{t('notifications.quietHoursTitle')}</Text>
            <Text style={styles.switchHint}>{t('notifications.quietHoursHint')}</Text>
          </View>
          <Switch
            value={quietHoursEnabled}
            onValueChange={(value) => {
              setQuietHoursEnabled(value);
              setQuietHoursEnabledState(value);
              void reconcileAllReminders();
            }}
            disabled={loading || isWeb}
            trackColor={{ false: theme.colors.border, true: theme.colors.accentMid }}
            thumbColor={quietHoursEnabled ? theme.colors.accent : theme.colors.card}
          />
        </View>
      </GlassCard>

      <Text style={ui.sectionLabel}>{t('notifications.asitSection')}</Text>
      <GlassCard>
        <Text style={styles.hint}>{t('notifications.asitHint')}</Text>
        <Button
          label={t('notifications.asitOpenCourse')}
          variant="secondary"
          block
          onPress={() => router.push('/asit-course' as any)}
        />
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
    },
    headerText: { flex: 1, gap: 2 },
    statusText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 10,
    },
    hint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 10,
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
    microHint: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
      lineHeight: 15,
      marginTop: 2,
    },
    switchGap: { marginTop: 14 },
    timeLabel: { marginTop: 14, marginBottom: 8 },
    timeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    timeField: { flex: 1, gap: 6 },
    timeFieldLabel: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
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
    thresholdRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    thresholdBtn: {
      flex: 1,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 8,
      alignItems: 'center',
    },
    thresholdBtnActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentMid,
    },
    thresholdBtnText: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    thresholdBtnTextActive: {
      fontFamily: fonts.sansSemiBold,
      fontWeight: '600',
      color: colors.text,
    },
  });
}
