import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ALLERGY_CONDITION_TYPES,
  type AllergyConditionId,
  type ConditionOptionSelections,
} from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

interface ConditionPickerProps {
  selected: AllergyConditionId[];
  onChange: (selected: AllergyConditionId[]) => void;
  /** FR-PROF-03: sub-options for selected types (setup / edit). */
  optionSelections?: ConditionOptionSelections;
  onOptionSelectionsChange?: (selections: ConditionOptionSelections) => void;
  /** When false, hides option expanders (legacy compact mode). Default true. */
  showOptions?: boolean;
}

export function ConditionPicker({
  selected,
  onChange,
  optionSelections = {},
  onOptionSelectionsChange,
  showOptions = true,
}: ConditionPickerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

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
  });
}
