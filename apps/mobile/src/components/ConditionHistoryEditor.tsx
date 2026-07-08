import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ALLERGY_CONDITION_TYPES,
  CONDITION_EPISODE_STATUSES,
  CONDITION_ONSET_KINDS,
  FOOD_SYMPTOM_TIMINGS,
  type AllergyConditionId,
  type ConditionDiagnosedBy,
  type ConditionEpisodeInput,
  type ConditionEpisodeStatus,
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

export function ConditionHistoryEditor({
  conditionIds,
  drafts,
  onChange,
}: ConditionHistoryEditorProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

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

  const cycleDiagnosedBy = (current: ConditionDiagnosedBy): ConditionDiagnosedBy => {
    if (current === 'self_reported') return 'specific_ige';
    if (current === 'specific_ige') return 'clinician';
    return 'self_reported';
  };

  return (
    <View style={styles.wrap}>
      {conditionIds.map((conditionId) => {
        const meta = ALLERGY_CONDITION_TYPES.find((item) => item.id === conditionId);
        const episode = getDraft(drafts, conditionId);

        return (
          <View key={conditionId} style={styles.card}>
            <Text style={styles.cardTitle}>{meta?.label ?? conditionId}</Text>

            <Text style={styles.fieldLabel}>{t('profileSetup.conditionHistory.onsetLabel')}</Text>
            <ChipRow
              options={CONDITION_ONSET_KINDS}
              selected={episode.onsetKind}
              labelFor={(value) =>
                t(`profileSetup.conditionHistory.onset.${value as ConditionOnsetKind}`)
              }
              onSelect={(value) => updateEpisode(conditionId, { onsetKind: value })}
            />

            <Text style={styles.fieldLabel}>{t('profileSetup.conditionHistory.onsetYearLabel')}</Text>
            <TextInput
              value={episode.onsetYear !== undefined ? String(episode.onsetYear) : ''}
              onChangeText={(text) => updateEpisode(conditionId, { onsetYear: text })}
              placeholder={t('profileSetup.conditionHistory.onsetYearPlaceholder')}
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="numeric"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>{t('profileSetup.conditionHistory.statusLabel')}</Text>
            <ChipRow
              options={CONDITION_EPISODE_STATUSES}
              selected={episode.status}
              labelFor={(value) =>
                t(`profileSetup.conditionHistory.status.${value as ConditionEpisodeStatus}`)
              }
              onSelect={(value) => updateEpisode(conditionId, { status: value })}
            />

            <Pressable
              style={styles.confirmationRow}
              onPress={() =>
                updateEpisode(conditionId, {
                  diagnosedBy: cycleDiagnosedBy(episode.diagnosedBy),
                })
              }>
              <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.accent} />
              <Text style={styles.confirmationText}>
                {t('profileSetup.conditionHistory.confirmedBy')}:{' '}
                {t(`profileSetup.confirmation${diagnosedByKey(episode.diagnosedBy)}`)}
              </Text>
            </Pressable>

            {conditionId === 'food' ? (
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
            ) : null}

            <Text style={styles.fieldLabel}>{t('profileSetup.conditionHistory.notesLabel')}</Text>
            <TextInput
              value={episode.notes ?? ''}
              onChangeText={(text) => updateEpisode(conditionId, { notes: text })}
              placeholder={t('profileSetup.conditionHistory.notesPlaceholder')}
              placeholderTextColor={theme.colors.textMuted}
              multiline
              style={[styles.input, styles.notesInput]}
            />
          </View>
        );
      })}
    </View>
  );
}

function diagnosedByKey(source: ConditionDiagnosedBy): 'Self' | 'Ige' | 'Clinician' {
  if (source === 'specific_ige') return 'Ige';
  if (source === 'clinician') return 'Clinician';
  return 'Self';
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
    confirmationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    confirmationText: {
      flex: 1,
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
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
