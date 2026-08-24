import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ALLERGY_CONDITION_TYPES,
  ALLERGY_CONFIRMATION_SOURCES,
  CONDITION_EPISODE_STATUSES,
  CONDITION_ONSET_KINDS,
  FOOD_SYMPTOM_TIMINGS,
  computeOnsetYear,
  listConditionHistoryQuestionsForCondition,
  type AllergyConditionId,
  type AllergyConfirmationSource,
  type ConditionDiagnosedBy,
  type ConditionEpisodeInput,
  type ConditionEpisodeStatus,
  type ConditionHistoryQuestionId,
  type ConditionHistoryQuestionPage,
  type ConditionOnsetKind,
  type FoodSymptomTiming,
} from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

export type ConditionHistoryDrafts = Partial<Record<AllergyConditionId, ConditionEpisodeInput>>;

interface ConditionHistoryEditorProps {
  conditionIds: AllergyConditionId[];
  drafts: ConditionHistoryDrafts;
  onChange: (drafts: ConditionHistoryDrafts) => void;
  /** Profile birth year — used to derive onsetYear from age input. */
  birthYear?: string;
  /** When set, show only that question for that type (wizard one-question screens). */
  page?: ConditionHistoryQuestionPage | null;
}

function defaultEpisodeInput(): ConditionEpisodeInput {
  return {
    onsetKind: 'unknown',
    status: 'active',
    diagnosedBy: 'self_reported',
  };
}

function getDraft(
  drafts: ConditionHistoryDrafts,
  conditionId: AllergyConditionId,
): ConditionEpisodeInput {
  return { ...defaultEpisodeInput(), ...drafts[conditionId] };
}

function diagnosedByKey(source: ConditionDiagnosedBy): 'Self' | 'Ige' | 'Clinician' {
  if (source === 'specific_ige') return 'Ige';
  if (source === 'clinician') return 'Clinician';
  return 'Self';
}

export function ConditionHistoryEditor({
  conditionIds,
  drafts,
  onChange,
  birthYear,
  page,
}: ConditionHistoryEditorProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const parsedBirthYear = useMemo(() => {
    const year = Number(birthYear);
    return Number.isFinite(year) && year > 1900 ? year : undefined;
  }, [birthYear]);

  if (!conditionIds.length) {
    return <Text style={styles.empty}>{t('profileSetup.conditionHistory.empty')}</Text>;
  }

  const updateEpisode = (
    conditionId: AllergyConditionId,
    patch: Partial<ConditionEpisodeInput>,
  ) => {
    onChange({
      ...drafts,
      [conditionId]: { ...getDraft(drafts, conditionId), ...patch },
    });
  };

  const handleAgeChange = (conditionId: AllergyConditionId, text: string) => {
    const ageRaw = text.trim();
    const age = Number(ageRaw);
    const patch: Partial<ConditionEpisodeInput> = { onsetAgeYears: ageRaw };

    if (ageRaw && Number.isFinite(age) && age >= 0 && parsedBirthYear !== undefined) {
      patch.onsetYear = computeOnsetYear(parsedBirthYear, age);
    } else if (!ageRaw) {
      patch.onsetYear = undefined;
    }

    updateEpisode(conditionId, patch);
  };

  const visibleIds = page ? [page.conditionId] : conditionIds;

  const renderQuestion = (
    conditionId: AllergyConditionId,
    questionId: ConditionHistoryQuestionId,
    episode: ConditionEpisodeInput,
  ) => {
    switch (questionId) {
      case 'onsetKind':
        return (
          <>
            <Text style={styles.fieldLabel}>{t('profileSetup.conditionHistory.onsetLabel')}</Text>
            <ChipRow
              options={CONDITION_ONSET_KINDS}
              selected={episode.onsetKind}
              labelFor={(value) =>
                t(`profileSetup.conditionHistory.onset.${value as ConditionOnsetKind}`)
              }
              onSelect={(value) => updateEpisode(conditionId, { onsetKind: value })}
            />
          </>
        );
      case 'onsetAge':
        return (
          <>
            <Text style={styles.fieldLabel}>{t('profileSetup.conditionHistory.onsetAgeLabel')}</Text>
            <TextInput
              value={episode.onsetAgeYears !== undefined ? String(episode.onsetAgeYears) : ''}
              onChangeText={(text) => handleAgeChange(conditionId, text)}
              placeholder={t('profileSetup.conditionHistory.onsetAgePlaceholder')}
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="numeric"
              style={styles.input}
            />
          </>
        );
      case 'status':
        return (
          <>
            <Text style={styles.fieldLabel}>{t('profileSetup.conditionHistory.statusLabel')}</Text>
            <ChipRow
              options={CONDITION_EPISODE_STATUSES}
              selected={episode.status}
              labelFor={(value) =>
                t(`profileSetup.conditionHistory.status.${value as ConditionEpisodeStatus}`)
              }
              onSelect={(value) => updateEpisode(conditionId, { status: value })}
            />
          </>
        );
      case 'diagnosedBy':
        return (
          <>
            <Text style={styles.fieldLabel}>{t('profileSetup.conditionHistory.confirmedBy')}</Text>
            <ChipRow
              options={ALLERGY_CONFIRMATION_SOURCES}
              selected={episode.diagnosedBy}
              labelFor={(value) =>
                t(`profileSetup.confirmation${diagnosedByKey(value as AllergyConfirmationSource)}`)
              }
              onSelect={(value) =>
                updateEpisode(conditionId, { diagnosedBy: value as ConditionDiagnosedBy })
              }
            />
          </>
        );
      case 'foodSymptomTiming':
        return (
          <>
            <Text style={styles.fieldLabel}>
              {t('profileSetup.conditionHistory.foodTimingLabel')}
            </Text>
            <ChipRow
              options={FOOD_SYMPTOM_TIMINGS}
              selected={episode.foodSymptomTiming ?? 'unknown'}
              labelFor={(value) =>
                t(`profileSetup.conditionHistory.foodTiming.${value as FoodSymptomTiming}`)
              }
              onSelect={(value) => updateEpisode(conditionId, { foodSymptomTiming: value })}
            />
          </>
        );
      case 'ocularSymptoms':
        return (
          <Pressable
            style={styles.checkRow}
            onPress={() =>
              updateEpisode(conditionId, {
                ocularSymptoms: !episode.ocularSymptoms,
              })
            }>
            <View style={[styles.checkbox, episode.ocularSymptoms && styles.checkboxActive]} />
            <Text style={styles.checkText}>{t('profileSetup.conditionHistory.ocularSymptoms')}</Text>
          </Pressable>
        );
      case 'notes':
        return (
          <>
            <Text style={styles.fieldLabel}>{t('profileSetup.conditionHistory.notesLabel')}</Text>
            <TextInput
              value={episode.notes ?? ''}
              onChangeText={(text) => updateEpisode(conditionId, { notes: text })}
              placeholder={t('profileSetup.conditionHistory.notesPlaceholder')}
              placeholderTextColor={theme.colors.textMuted}
              multiline
              style={[styles.input, styles.notesInput]}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.wrap}>
      {visibleIds.map((conditionId) => {
        const meta = ALLERGY_CONDITION_TYPES.find((item) => item.id === conditionId);
        const episode = getDraft(drafts, conditionId);
        const questions = page
          ? [page.questionId]
          : listConditionHistoryQuestionsForCondition(conditionId);

        return (
          <View key={conditionId} style={styles.card}>
            <Text style={styles.cardTitle}>{meta?.label ?? conditionId}</Text>
            {questions.map((questionId) => (
              <View key={questionId}>{renderQuestion(conditionId, questionId, episode)}</View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

interface ChipRowProps<T extends string> {
  options: readonly T[];
  selected: T;
  labelFor: (value: T) => string;
  onSelect: (value: T) => void;
}

function ChipRow<T extends string>({ options, selected, labelFor, onSelect }: ChipRowProps<T>) {
  const theme = useTheme();
  const styles = useMemo(() => createChipStyles(theme), [theme]);

  return (
    <View style={styles.chipGrid}>
      {options.map((value) => {
        const active = selected === value;
        return (
          <Pressable
            key={value}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(value)}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {labelFor(value)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 12 },
    empty: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    card: {
      gap: 8,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.borderInput,
      backgroundColor: colors.card,
    },
    cardTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    fieldLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 4,
    },
    input: {
      backgroundColor: colors.bg,
      padding: 12,
      borderRadius: 6,
      fontSize: 15,
      fontFamily: fonts.sans,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    notesInput: { minHeight: 72, textAlignVertical: 'top' },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 6,
    },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.borderInput,
      backgroundColor: colors.bg,
    },
    checkboxActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    checkText: {
      flex: 1,
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
}

function createChipStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: 6,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    chipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    chipText: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
    },
    chipTextActive: {
      fontFamily: fonts.sansSemiBold,
      fontWeight: '600',
      color: colors.accent,
    },
  });
}
