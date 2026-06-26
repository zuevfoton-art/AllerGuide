import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ASIT_PHASE_LABELS,
  ASIT_ROUTE_LABELS,
  DEFAULT_ASIT_REMINDER_HOUR,
  DEFAULT_ASIT_REMINDER_MINUTE,
  formatAsitReminderTime,
  isAsitReminderConfigured,
  type AsitCourse,
  type AsitPhase,
  type AsitRoute,
} from '@allerguide/core';
import { Screen } from '@/src/components/Screen';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { useAppStore } from '@/src/store/app-store';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { Ionicons } from '@expo/vector-icons';
import {
  createEmptyAsitCourse,
  getAsitCourse,
  saveAsitCourse,
} from '@/src/services/asit-course-service';
import { ensureNotificationPermission, syncAsitReminder } from '@/src/services/asit-reminder-service';
import { getAsitReminderNotificationContent } from '@/src/services/notification-content-service';
import { profileEnablesAsit } from '@allerguide/core';
import { getProfileConditions } from '@/src/services/profile-conditions-service';

const ROUTES: AsitRoute[] = ['slit', 'scit'];
const PHASES: AsitPhase[] = ['buildup', 'maintenance'];

export default function AsitCourseScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.activeProfile);
  const profileId = profile?.id;
  const [course, setCourse] = useState<AsitCourse>(() => createEmptyAsitCourse());

  const asitEnabled = useMemo(() => {
    if (!profile) return false;
    return profileEnablesAsit(getProfileConditions(profile));
  }, [profile]);

  useEffect(() => {
    if (!profileId) return;
    const existing = getAsitCourse(profileId);
    if (existing) {
      setCourse(existing);
      void syncAsitReminder(profileId, existing, getAsitReminderNotificationContent(existing));
    }
  }, [profileId]);

  const save = async () => {
    if (!profileId) return;
    saveAsitCourse(profileId, course);
    if (isAsitReminderConfigured(course)) {
      await ensureNotificationPermission();
    }
    router.back();
  };

  const reminderEnabled = isAsitReminderConfigured(course);

  const toggleReminder = (enabled: boolean) => {
    setCourse((prev) => {
      if (!enabled) {
        const next = { ...prev };
        delete next.reminderHour;
        delete next.reminderMinute;
        return next;
      }
      return {
        ...prev,
        reminderHour: prev.reminderHour ?? DEFAULT_ASIT_REMINDER_HOUR,
        reminderMinute: prev.reminderMinute ?? DEFAULT_ASIT_REMINDER_MINUTE,
      };
    });
  };

  if (!profile) {
    return (
      <Screen>
        <Text style={styles.empty}>{t('asit.noProfile')}</Text>
      </Screen>
    );
  }

  if (!asitEnabled) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={ui.docLabel}>AllerGuide · {t('asit.eyebrow')}</Text>
            <Text style={ui.docTitle}>{t('asit.courseTitle')}</Text>
          </View>
        </View>
        <GlassCard>
          <Text style={styles.hint}>{t('asit.notEligible')}</Text>
        </GlassCard>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={ui.docLabel}>AllerGuide · {t('asit.eyebrow')}</Text>
          <Text style={ui.docTitle}>{t('asit.courseTitle')}</Text>
          <Text style={ui.docMeta}>{t('asit.courseSubtitle')}</Text>
        </View>
      </View>

      <GlassCard style={styles.section}>
        <Text style={ui.sectionLabel}>{t('asit.allergenLabel')}</Text>
        <TextInput
          style={styles.input}
          value={course.allergen}
          onChangeText={(allergen) => setCourse((prev) => ({ ...prev, allergen }))}
          placeholder={t('asit.allergenPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.drugLabel')}</Text>
        <TextInput
          style={styles.input}
          value={course.drug}
          onChangeText={(drug) => setCourse((prev) => ({ ...prev, drug }))}
          placeholder={t('asit.drugPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.routeLabel')}</Text>
        <View style={ui.toggleRow}>
          {ROUTES.map((route) => (
            <Pressable
              key={route}
              style={[ui.toggle, course.route === route && ui.toggleActive]}
              onPress={() => setCourse((prev) => ({ ...prev, route }))}>
              <Text style={[ui.toggleText, course.route === route && ui.toggleTextActive]}>
                {ASIT_ROUTE_LABELS[route]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.phaseLabel')}</Text>
        <View style={ui.toggleRow}>
          {PHASES.map((phase) => (
            <Pressable
              key={phase}
              style={[ui.toggle, course.phase === phase && ui.toggleActive]}
              onPress={() => setCourse((prev) => ({ ...prev, phase }))}>
              <Text style={[ui.toggleText, course.phase === phase && ui.toggleTextActive]}>
                {ASIT_PHASE_LABELS[phase]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.startDateLabel')}</Text>
        <TextInput
          style={styles.input}
          value={course.startDate}
          onChangeText={(startDate) => setCourse((prev) => ({ ...prev, startDate }))}
          placeholder={t('asit.startDatePlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.scheduleLabel')}</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={course.scheduleNotes}
          onChangeText={(scheduleNotes) => setCourse((prev) => ({ ...prev, scheduleNotes }))}
          placeholder={t('asit.schedulePlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          textAlignVertical="top"
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.reminderLabel')}</Text>
        <View style={ui.toggleRow}>
          <Pressable
            style={[ui.toggle, reminderEnabled && ui.toggleActive]}
            onPress={() => toggleReminder(true)}>
            <Text style={[ui.toggleText, reminderEnabled && ui.toggleTextActive]}>
              {t('asit.reminderOn')}
            </Text>
          </Pressable>
          <Pressable
            style={[ui.toggle, !reminderEnabled && ui.toggleActive]}
            onPress={() => toggleReminder(false)}>
            <Text style={[ui.toggleText, !reminderEnabled && ui.toggleTextActive]}>
              {t('asit.reminderOff')}
            </Text>
          </Pressable>
        </View>

        {reminderEnabled ? (
          <View style={styles.reminderRow}>
            <View style={styles.reminderField}>
              <Text style={styles.reminderFieldLabel}>{t('asit.reminderHour')}</Text>
              <TextInput
                style={styles.input}
                value={String(course.reminderHour ?? DEFAULT_ASIT_REMINDER_HOUR)}
                onChangeText={(value) => {
                  const hour = Number(value.replace(/\D/g, ''));
                  if (!Number.isFinite(hour)) return;
                  setCourse((prev) => ({ ...prev, reminderHour: Math.min(23, Math.max(0, hour)) }));
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={styles.reminderField}>
              <Text style={styles.reminderFieldLabel}>{t('asit.reminderMinute')}</Text>
              <TextInput
                style={styles.input}
                value={String(course.reminderMinute ?? DEFAULT_ASIT_REMINDER_MINUTE)}
                onChangeText={(value) => {
                  const minute = Number(value.replace(/\D/g, ''));
                  if (!Number.isFinite(minute)) return;
                  setCourse((prev) => ({
                    ...prev,
                    reminderMinute: Math.min(59, Math.max(0, minute)),
                  }));
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <Text style={styles.reminderPreview}>
              {formatAsitReminderTime(
                course.reminderHour ?? DEFAULT_ASIT_REMINDER_HOUR,
                course.reminderMinute ?? DEFAULT_ASIT_REMINDER_MINUTE,
              )}
            </Text>
          </View>
        ) : (
          <Text style={styles.hint}>{t('asit.reminderHint')}</Text>
        )}
      </GlassCard>

      <Button label={t('asit.saveCourse')} variant="primary" block onPress={save} />

      <Disclaimer>{t('asit.disclaimer')}</Disclaimer>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
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
    section: { gap: 4, marginBottom: 12 },
    fieldGap: { marginTop: 12 },
    input: {
      backgroundColor: colors.card,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.borderInput,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: fonts.sans,
      color: colors.text,
    },
    inputMultiline: { minHeight: 96, lineHeight: 22 },
    reminderRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
    reminderField: { flex: 1, gap: 4 },
    reminderFieldLabel: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
    },
    reminderPreview: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      fontWeight: '600',
      color: colors.accent,
      paddingBottom: 12,
    },
    empty: {
      fontFamily: fonts.sans,
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 24,
    },
    hint: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
  });
}
