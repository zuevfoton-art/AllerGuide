import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ASIT_PHASE_LABELS,
  ASIT_ROUTE_LABELS,
  computeAsitCompliance,
  formatAsitReminderTime,
  isAsitCourseConfigured,
  isAsitReminderConfigured,
  type AsitCourse,
} from '@allerguide/core';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTranslation } from '@/src/store/locale-store';
import type { DiaryEntry } from '@/src/types';

interface AsitCourseCardProps {
  course: AsitCourse | null;
  entries: DiaryEntry[];
  onLogDose: () => void;
}

export function AsitCourseCard({ course, entries, onLogDose }: AsitCourseCardProps) {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const compliance = useMemo(() => computeAsitCompliance(entries, 30), [entries]);

  if (!course || !isAsitCourseConfigured(course)) {
    return (
      <GlassCard style={styles.card}>
        <View style={styles.headerRow}>
          <Ionicons name="fitness" size={18} color={theme.colors.accent} />
          <Text style={ui.cardTitle}>{t('asit.title')}</Text>
        </View>
        <Text style={styles.hint}>{t('asit.emptyCourse')}</Text>
        <Button
          label={t('asit.setupCourse')}
          variant="secondary"
          size="sm"
          onPress={() => router.push('/asit-course' as any)}
        />
      </GlassCard>
    );
  }

  return (
    <GlassCard style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="fitness" size={18} color={theme.colors.accent} />
        <Text style={ui.cardTitle}>{t('asit.title')}</Text>
        <Pressable style={styles.editBtn} onPress={() => router.push('/asit-course' as any)}>
          <Text style={styles.editText}>{t('asit.editCourse')}</Text>
        </Pressable>
      </View>

      <Text style={styles.drug}>{course.drug}</Text>
      <Text style={styles.meta}>
        {course.allergen} · {ASIT_ROUTE_LABELS[course.route]} · {ASIT_PHASE_LABELS[course.phase]}
      </Text>
      {course.scheduleNotes.trim() ? (
        <Text style={styles.schedule}>{course.scheduleNotes.trim()}</Text>
      ) : null}
      {isAsitReminderConfigured(course) ? (
        <Text style={styles.reminder}>
          {t('asit.reminderAt', {
            time: formatAsitReminderTime(course.reminderHour ?? 8, course.reminderMinute ?? 0),
          })}
        </Text>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{compliance.totalDoses}</Text>
          <Text style={styles.statLabel}>{t('asit.doses30d')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{compliance.onTime}</Text>
          <Text style={styles.statLabel}>{t('asit.onTime')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{compliance.missed}</Text>
          <Text style={styles.statLabel}>{t('asit.missed')}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button label={t('asit.logDose')} variant="primary" size="sm" onPress={onLogDose} />
      </View>

      <Text style={styles.disclaimer}>{t('asit.disclaimer')}</Text>
    </GlassCard>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    card: { gap: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    editBtn: { marginLeft: 'auto' },
    editText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.accent,
    },
    hint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    drug: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      fontWeight: '600',
      color: colors.head,
    },
    meta: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
    },
    schedule: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
    },
    reminder: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.accent,
    },
    statsRow: { flexDirection: 'row', gap: 8 },
    stat: {
      flex: 1,
      backgroundColor: colors.surfaceMuted,
      borderRadius: 6,
      paddingVertical: 10,
      paddingHorizontal: 8,
      alignItems: 'center',
      gap: 2,
    },
    statValue: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 18,
      fontWeight: '700',
      color: colors.head,
    },
    statLabel: {
      fontFamily: fonts.sans,
      fontSize: 10,
      color: colors.textMuted,
      textAlign: 'center',
    },
    actions: { flexDirection: 'row', gap: 8 },
    disclaimer: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
      lineHeight: 15,
    },
  });
}
