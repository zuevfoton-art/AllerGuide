import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ALLERGY_CONDITION_TYPES,
  OTHER_CONDITION_LABEL_MAX_LENGTH,
  type AllergyConditionId,
  type ConditionOptionSelections,
} from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { WEB_INPUT_FONT_SIZE } from '@/src/constants/layout';
import { useTranslation } from '@/src/store/locale-store';

interface ConditionPickerProps {
  selected: AllergyConditionId[];
  onChange: (selected: AllergyConditionId[]) => void;
  /** Free-text name when `other` is selected. */
  otherLabel?: string;
  onOtherLabelChange?: (value: string) => void;
  /** FR-PROF-03 legacy: sub-options for selected types. Default off — allergens are picked on the next step. */
  optionSelections?: ConditionOptionSelections;
  onOptionSelectionsChange?: (selections: ConditionOptionSelections) => void;
  /** When true, shows option expanders. Default false. */
  showOptions?: boolean;
}

export function ConditionPicker({
  selected,
  onChange,
  otherLabel = '',
  onOtherLabelChange,
  optionSelections = {},
  onOptionSelectionsChange,
  showOptions = false,
}: ConditionPickerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const otherSelected = selected.includes('other');

  const toggle = (id: AllergyConditionId) => {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  };

  const toggleOption = (conditionId: AllergyConditionId, optionId: string) => {
    if (!onOptionSelectionsChange) return;
    const current = optionSelections[conditionId] ?? [];
    const nextOptions = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];
    const next: ConditionOptionSelections = { ...optionSelections };
    if (nextOptions.length === 0) delete next[conditionId];
    else next[conditionId] = nextOptions;
    onOptionSelectionsChange(next);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.chipGrid}>
        {ALLERGY_CONDITION_TYPES.map((item) => {
          const active = selected.includes(item.id);
          return (
            <Pressable
              key={item.id}
              testID={`condition-${item.id}`}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggle(item.id)}>
              {active ? (
                <Ionicons name="checkmark-circle" size={14} color={theme.colors.accent} />
              ) : null}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {otherSelected ? (
        <View style={styles.otherBlock} testID="condition-other-label">
          <Text style={styles.optionsTitle}>{t('profileSetup.otherConditionLabel')}</Text>
          <Text style={styles.optionsHint}>{t('profileSetup.otherConditionHint')}</Text>
          <TextInput
            testID="condition-other-input"
            value={otherLabel}
            onChangeText={(value) =>
              onOtherLabelChange?.(value.slice(0, OTHER_CONDITION_LABEL_MAX_LENGTH))
            }
            placeholder={t('profileSetup.otherConditionPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            style={styles.otherInput}
          />
        </View>
      ) : null}

      {showOptions
        ? ALLERGY_CONDITION_TYPES.filter(
            (item) => selected.includes(item.id) && item.options && item.options.length > 0,
          ).map((item) => (
            <View key={`options-${item.id}`} style={styles.optionsBlock} testID={`condition-options-${item.id}`}>
              <Text style={styles.optionsTitle}>
                {t('profileSetup.conditionOptionsTitle', { label: item.label })}
              </Text>
              <Text style={styles.optionsHint}>{t('profileSetup.conditionOptionsHint')}</Text>
              <View style={styles.chipGrid}>
                {item.options!.map((option) => {
                  const active = (optionSelections[item.id] ?? []).includes(option.id);
                  return (
                    <Pressable
                      key={option.id}
                      testID={`condition-option-${item.id}-${option.id}`}
                      style={[styles.optionChip, active && styles.chipActive]}
                      onPress={() => toggleOption(item.id, option.id)}>
                      {active ? (
                        <Ionicons name="checkmark-circle" size={14} color={theme.colors.accent} />
                      ) : null}
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        : null}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 12 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    optionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    chipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    chipText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    chipTextActive: { color: colors.accent },
    optionsBlock: { gap: 6 },
    otherBlock: { gap: 6 },
    optionsTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    optionsHint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 16,
    },
    otherInput: {
      borderWidth: 1,
      borderColor: colors.borderInput,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: fonts.sans,
      fontSize: WEB_INPUT_FONT_SIZE,
      color: colors.text,
      backgroundColor: colors.card,
    },
  });
}
