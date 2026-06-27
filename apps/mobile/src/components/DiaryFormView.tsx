import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  buildIntoleranceAlert,
  encodeDiaryDetails,
  hasSectionAnswers,
  type DiarySection,
  type DiaryStep,
} from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { WEB_INPUT_FONT_SIZE } from '@/src/constants/layout';
import { useTranslation } from '@/src/store/locale-store';
import type { DiaryWizardResult } from './DiaryWizard';

interface DiaryFormViewProps {
  section: DiarySection;
  initialAnswers?: Record<string, string>;
  submitLabel?: string;
  onCancel: () => void;
  onComplete: (entries: DiaryWizardResult[]) => void;
  onDelete?: () => void;
  drugIntolerances?: string[];
}

export function DiaryFormView({
  section,
  initialAnswers,
  submitLabel,
  onCancel,
  onComplete,
  onDelete,
  drugIntolerances,
}: DiaryFormViewProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers ?? {});
  const [showOptional, setShowOptional] = useState(false);
  const [error, setError] = useState('');

  const requiredSteps = useMemo(
    () => section.steps.filter((s) => s.required && s.id !== 'intoleranceAlert'),
    [section],
  );
  const optionalSteps = useMemo(
    () => section.steps.filter((s) => !s.required && s.id !== 'intoleranceAlert'),
    [section],
  );

  const setAnswer = (stepId: string, value: string) => {
    setError('');
    setAnswers((prev) => {
      const next = { ...prev, [stepId]: value };
      if (stepId === 'medicine' && drugIntolerances?.length) {
        const alert = buildIntoleranceAlert(value, drugIntolerances);
        if (alert) next.intoleranceAlert = alert;
        else delete next.intoleranceAlert;
      }
      return next;
    });
  };

  const handleSave = () => {
    for (const step of requiredSteps) {
      if (!answers[step.id]?.trim()) {
        setError(t('diaryForm.fillRequired'));
        return;
      }
    }
    if (!hasSectionAnswers(section, answers)) {
      setError(t('diaryForm.fillRequired'));
      return;
    }
    const details = encodeDiaryDetails(answers, section.type);
    onComplete([{ type: section.type, details }]);
  };

  const intoleranceAlert = answers.intoleranceAlert;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons name={section.icon as any} size={14} color={theme.colors.accent} />
          <Text style={styles.badgeText}>{section.title}</Text>
        </View>
        <Pressable onPress={onCancel}>
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </Pressable>
      </View>

      {intoleranceAlert ? (
        <View style={styles.alertBox}>
          <Ionicons name="warning" size={14} color={theme.colors.danger} />
          <Text style={styles.alertText}>{intoleranceAlert}</Text>
        </View>
      ) : null}

      {requiredSteps.map((step) => (
        <FormField
          key={step.id}
          step={step}
          value={answers[step.id] ?? ''}
          onChange={(v) => setAnswer(step.id, v)}
        />
      ))}

      {optionalSteps.length > 0 ? (
        <>
          <Pressable
            style={styles.optionalToggle}
            onPress={() => setShowOptional((v) => !v)}>
            <Ionicons
              name={showOptional ? 'chevron-up' : 'add-circle-outline'}
              size={15}
              color={theme.colors.accent}
            />
            <Text style={styles.optionalToggleText}>
              {showOptional ? t('diaryForm.hideDetails') : t('diaryForm.addDetails')}
            </Text>
          </Pressable>
          {showOptional
            ? optionalSteps.map((step) => (
                <FormField
                  key={step.id}
                  step={step}
                  value={answers[step.id] ?? ''}
                  onChange={(v) => setAnswer(step.id, v)}
                />
              ))
            : null}
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>{submitLabel ?? t('common.save')}</Text>
      </Pressable>

      {onDelete ? (
        <Pressable style={styles.deleteBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={14} color={theme.colors.danger} />
          <Text style={styles.deleteText}>{t('diaryWizard.deleteEntry')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function FormField({
  step,
  value,
  onChange,
}: {
  step: DiaryStep;
  value: string;
  onChange: (v: string) => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createFieldStyles(theme), [theme]);

  const isRating = step.field === 'choice' && (step.choices?.length ?? 0) >= 10;

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{step.label}</Text>
      {isRating ? (
        <RatingRow choices={step.choices!} value={value} onChange={onChange} />
      ) : step.field === 'choice' && step.choices ? (
        <View style={styles.choiceGrid}>
          {step.choices.map((choice) => {
            const active = value === choice;
            return (
              <Pressable
                key={choice}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => onChange(choice)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{choice}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <TextInput
          style={[styles.input, step.multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChange}
          placeholder={step.placeholder}
          placeholderTextColor={theme.colors.textMuted}
          multiline={step.multiline}
          textAlignVertical={step.multiline ? 'top' : 'center'}
        />
      )}
    </View>
  );
}

function RatingRow({
  choices,
  value,
  onChange,
}: {
  choices: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createRatingStyles(theme), [theme]);

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}>
        {choices.map((choice, i) => {
          const active = value === choice;
          return (
            <Pressable
              key={choice}
              style={[styles.circle, active && styles.circleActive]}
              onPress={() => onChange(choice)}>
              <Text style={[styles.circleNum, active && styles.circleNumActive]}>{i}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {value ? (
        <Text style={styles.selectedLabel}>{value}</Text>
      ) : null}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: {
      gap: 14,
      padding: 16,
      borderRadius: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      backgroundColor: colors.accentLight,
      borderWidth: 1,
      borderColor: colors.accentMid,
    },
    badgeText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.accent,
    },
    cancelText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
    alertBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 10,
      borderRadius: 6,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    alertText: {
      flex: 1,
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.danger,
      lineHeight: 18,
    },
    optionalToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 2,
    },
    optionalToggleText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
    error: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.danger,
    },
    saveBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 6,
      backgroundColor: colors.accent,
      minHeight: 44,
    },
    saveBtnText: {
      fontFamily: fonts.sansSemiBold,
      color: colors.onAccent,
      fontWeight: '600',
      fontSize: 15,
    },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 4,
    },
    deleteText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.danger,
    },
  });
}

function createFieldStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    fieldWrap: { gap: 8 },
    fieldLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.head,
      lineHeight: 20,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.borderInput,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: Platform.OS === 'web' ? WEB_INPUT_FONT_SIZE : 15,
      fontFamily: fonts.sans,
      color: colors.text,
    },
    inputMultiline: { minHeight: 110, lineHeight: 22, textAlignVertical: 'top' },
    choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    chipActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
    chipText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    chipTextActive: { color: colors.accent },
  });
}

function createRatingStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    scroll: { flexGrow: 0 },
    scrollContent: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
    circle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.borderInput,
      backgroundColor: colors.card,
    },
    circleActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    circleNum: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    circleNumActive: { color: colors.accent },
    selectedLabel: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
    },
  });
}
