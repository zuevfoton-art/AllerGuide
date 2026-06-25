import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  computeScaleScore,
  encodeDiaryDetails,
  enrichScaleAnswers,
  getDiaryStepAnswers,
  getScaleIdFromAnswers,
  hasSectionAnswers,
  validateClinicalScale,
  validateDiarySectionStep,
  buildIntoleranceAlert,
  type DiarySection,
  type DiaryStep,
} from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { WEB_INPUT_FONT_SIZE } from '@/src/constants/layout';
import { useTranslation } from '@/src/store/locale-store';
import { localizeDiarySections } from '@/src/i18n/content';

export interface DiaryWizardResult {
  type: string;
  details: string;
}

interface DiaryWizardProps {
  sections?: DiarySection[];
  initialAnswersBySection?: Record<string, Record<string, string>>;
  onCancel: () => void;
  onComplete: (entries: DiaryWizardResult[]) => void;
  onDelete?: () => void;
  submitLabel?: string;
  allowSkipSection?: boolean;
  drugIntolerances?: string[];
}

export function DiaryWizard({
  sections: sectionsProp,
  initialAnswersBySection,
  onCancel,
  onComplete,
  onDelete,
  submitLabel,
  allowSkipSection = true,
  drugIntolerances,
}: DiaryWizardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, tDiaryError, locale, content } = useTranslation();
  const sections = useMemo(
    () => sectionsProp ?? localizeDiarySections(locale, content()),
    [sectionsProp, locale, content],
  );
  const [sectionIndex, setSectionIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [answersBySection, setAnswersBySection] = useState<Record<string, Record<string, string>>>(
    initialAnswersBySection ?? {},
  );
  const [error, setError] = useState('');

  const section = sections[sectionIndex];
  const step = section.steps[stepIndex];
  const sectionAnswers = answersBySection[section.type] ?? {};
  const totalSections = sections.length;
  const totalStepsInSection = section.steps.length;
  const overallStepNumber =
    sections.slice(0, sectionIndex).reduce((sum, item) => sum + item.steps.length, 0) +
    stepIndex +
    1;
  const overallStepsTotal = sections.reduce((sum, item) => sum + item.steps.length, 0);
  const isLastStep = sectionIndex === totalSections - 1 && stepIndex === totalStepsInSection - 1;
  const canSkipSection =
    allowSkipSection &&
    totalSections > 1 &&
    (!step.required || getDiaryStepAnswers(section, sectionAnswers).length > 0);

  const scalePreview =
    section.type === 'Шкала' && isLastStep
      ? (() => {
          const scaleId = getScaleIdFromAnswers(sectionAnswers);
          return scaleId ? computeScaleScore(scaleId, sectionAnswers) : null;
        })()
      : null;

  const setAnswer = (stepId: string, value: string) => {
    setAnswersBySection((prev) => {
      const nextSectionAnswers = {
        ...(prev[section.type] ?? {}),
        [stepId]: value,
      };
      if (stepId === 'medicine' && section.type === 'Лекарство' && drugIntolerances?.length) {
        const alert = buildIntoleranceAlert(value, drugIntolerances);
        if (alert) nextSectionAnswers.intoleranceAlert = alert;
        else delete nextSectionAnswers.intoleranceAlert;
      }
      return {
        ...prev,
        [section.type]: nextSectionAnswers,
      };
    });
  };

  const goNext = () => {
    const validationError =
      section.type === 'Шкала' && isLastStep
        ? validateClinicalScale(sectionAnswers)
        : validateDiarySectionStep(section, stepIndex, sectionAnswers);
    if (validationError) {
      setError(tDiaryError(validationError));
      return;
    }

    setError('');
    if (stepIndex < totalStepsInSection - 1) {
      setStepIndex((value) => value + 1);
      return;
    }

    if (sectionIndex < totalSections - 1) {
      setSectionIndex((value) => value + 1);
      setStepIndex(0);
      return;
    }

    finishWizard();
  };

  const goBack = () => {
    setError('');
    if (stepIndex > 0) {
      setStepIndex((value) => value - 1);
      return;
    }
    if (sectionIndex > 0) {
      const prevSection = sections[sectionIndex - 1];
      setSectionIndex((value) => value - 1);
      setStepIndex(prevSection.steps.length - 1);
    }
  };

  const skipSection = () => {
    setError('');
    if (sectionIndex < totalSections - 1) {
      setSectionIndex((value) => value + 1);
      setStepIndex(0);
      return;
    }
    finishWizard();
  };

  const finishWizard = () => {
    let scaleError: string | null = null;
    const entries = sections.flatMap((item) => {
      const answers = answersBySection[item.type] ?? {};
      if (!hasSectionAnswers(item, answers)) return [];

      if (item.type === 'Шкала') {
        scaleError = validateClinicalScale(answers);
        if (scaleError) return [];
        const enriched = enrichScaleAnswers(answers);
        return [{ type: item.type, details: encodeDiaryDetails(enriched, item.type) }];
      }

      return [{ type: item.type, details: encodeDiaryDetails(answers, item.type) }];
    });

    if (entries.length === 0) {
      setError(scaleError ? tDiaryError(scaleError) : t('diaryWizard.fillOneSection'));
      return;
    }

    onComplete(entries);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Text style={styles.progressText}>
          {t('diaryWizard.stepOf', { current: overallStepNumber, total: overallStepsTotal })}
        </Text>
        <Pressable onPress={onCancel}>
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </Pressable>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${(overallStepNumber / overallStepsTotal) * 100}%` }]}
        />
      </View>

      <View style={styles.sectionBadge}>
        <Ionicons name={section.icon as any} size={16} color={theme.colors.accent} />
        <Text style={styles.sectionBadgeText}>
          {section.title} · {stepIndex + 1}/{totalStepsInSection}
        </Text>
      </View>

      <Text style={styles.stepLabel}>{step.label}</Text>
      <StepField
        step={step}
        value={sectionAnswers[step.id] ?? ''}
        onChange={(value) => setAnswer(step.id, value)}
      />

      {scalePreview ? (
        <Text style={styles.scalePreview}>
          {t('diaryWizard.scalePreview', {
            score: scalePreview.total,
            interpretation: scalePreview.interpretation,
          })}
        </Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          style={[styles.secondaryBtn, sectionIndex === 0 && stepIndex === 0 && styles.btnDisabled]}
          disabled={sectionIndex === 0 && stepIndex === 0}
          onPress={goBack}>
          <Text style={styles.secondaryText}>{t('common.back')}</Text>
        </Pressable>
        <Pressable style={styles.primaryBtn} onPress={goNext}>
          <Text style={styles.primaryText}>
            {isLastStep ? (submitLabel ?? t('common.save')) : t('common.next')}
          </Text>
        </Pressable>
      </View>

      {canSkipSection ? (
        <Pressable style={styles.skipBtn} onPress={skipSection}>
          <Text style={styles.skipText}>{t('diaryWizard.skipSection')}</Text>
        </Pressable>
      ) : null}

      {onDelete ? (
        <Pressable style={styles.deleteBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
          <Text style={styles.deleteText}>{t('diaryWizard.deleteEntry')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

interface DiaryLegacyEditorProps {
  value: string;
  onCancel: () => void;
  onSave: (details: string) => void;
  onDelete?: () => void;
}

export function DiaryLegacyEditor({ value, onCancel, onSave, onDelete }: DiaryLegacyEditorProps) {
  const theme = useTheme();
  const styles = useMemo(() => createLegacyStyles(theme), [theme]);
  const { t } = useTranslation();
  const [text, setText] = useState(value);
  const [error, setError] = useState('');

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError(t('diaryWizard.enterEntryText'));
      return;
    }
    onSave(trimmed);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{t('diaryWizard.editEntry')}</Text>
        <Pressable onPress={onCancel}>
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </Pressable>
      </View>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={t('diaryWizard.entryPlaceholder')}
        placeholderTextColor={theme.colors.textMuted}
        multiline
        textAlignVertical="top"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primaryBtn} onPress={handleSave}>
        <Text style={styles.primaryText}>{t('diary.saveChanges')}</Text>
      </Pressable>
      {onDelete ? (
        <Pressable style={styles.deleteBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
          <Text style={styles.deleteText}>{t('diaryWizard.deleteEntry')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function StepField({
  step,
  value,
  onChange,
}: {
  step: DiaryStep;
  value: string;
  onChange: (value: string) => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createFieldStyles(theme), [theme]);

  if (step.field === 'choice' && step.choices) {
    return (
      <View style={styles.choiceGrid}>
        {step.choices.map((choice) => {
          const active = value === choice;
          return (
            <Pressable
              key={choice}
              style={[styles.choiceChip, active && styles.choiceChipActive]}
              onPress={() => onChange(choice)}>
              <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{choice}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <TextInput
      style={[styles.input, step.multiline && styles.inputMultiline]}
      value={value}
      onChangeText={onChange}
      placeholder={step.placeholder}
      placeholderTextColor={theme.colors.textMuted}
      multiline={step.multiline}
      textAlignVertical={step.multiline ? 'top' : 'center'}
    />
  );
}

function createLegacyStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: {
      gap: 14,
      padding: 16,
      borderRadius: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    cancelText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
    input: {
      minHeight: 140,
      backgroundColor: colors.card,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.borderInput,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: Platform.OS === 'web' ? WEB_INPUT_FONT_SIZE : 15,
      fontFamily: fonts.sans,
      color: colors.text,
      lineHeight: 22,
    },
    error: {
      fontFamily: fonts.sansSemiBold,
      color: colors.danger,
      fontSize: 13,
      fontWeight: '600',
    },
    primaryBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 6,
      backgroundColor: colors.accent,
      minHeight: 44,
    },
    primaryText: {
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
      paddingVertical: 8,
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
    inputMultiline: { minHeight: 120, lineHeight: 22 },
    choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    choiceChip: {
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    choiceChipActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
    choiceText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    choiceTextActive: { color: colors.accent },
  });
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
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    cancelText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
    progressTrack: {
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 999 },
    sectionBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: colors.accentLight,
      borderWidth: 1,
      borderColor: colors.accentMid,
    },
    sectionBadgeText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.accent,
    },
    stepLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 17,
      fontWeight: '600',
      color: colors.head,
      lineHeight: 24,
    },
    scalePreview: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.accent,
      lineHeight: 18,
      backgroundColor: colors.accentLight,
      borderRadius: 6,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.accentMid,
    },
    error: {
      fontFamily: fonts.sansSemiBold,
      color: colors.danger,
      fontSize: 13,
      fontWeight: '600',
    },
    actions: { flexDirection: 'row', gap: 8 },
    secondaryBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
      minHeight: 44,
    },
    secondaryText: {
      fontFamily: fonts.sansSemiBold,
      color: colors.text,
      fontWeight: '600',
      fontSize: 14,
    },
    primaryBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      borderRadius: 6,
      backgroundColor: colors.accent,
      minHeight: 44,
    },
    primaryText: {
      fontFamily: fonts.sansSemiBold,
      color: colors.onAccent,
      fontWeight: '600',
      fontSize: 14,
    },
    btnDisabled: { opacity: 0.45 },
    skipBtn: { alignItems: 'center', paddingVertical: 4 },
    skipText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
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
