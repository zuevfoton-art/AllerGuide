import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ALLERGY_CONDITION_TYPES, type AllergyConditionId } from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

const RAACI_CONDITION_IDS: AllergyConditionId[] = [
  'rhinitis',
  'asthma',
  'dermatitis',
  'pollinosis',
];

interface ConditionPickerProps {
  selected: AllergyConditionId[];
  onChange: (selected: AllergyConditionId[]) => void;
}

export function ConditionPicker({ selected, onChange }: ConditionPickerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const primary = ALLERGY_CONDITION_TYPES.filter((item) => RAACI_CONDITION_IDS.includes(item.id));
  const secondary = ALLERGY_CONDITION_TYPES.filter((item) => !RAACI_CONDITION_IDS.includes(item.id));

  const toggle = (id: AllergyConditionId) => {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  };

  const renderChip = (id: AllergyConditionId, label: string) => {
    const active = selected.includes(id);
    return (
      <Pressable
        key={id}
        style={[styles.chip, active && styles.chipActive]}
        onPress={() => toggle(id)}>
        {active ? <Ionicons name="checkmark-circle" size={14} color={theme.colors.accent} /> : null}
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>{t('profileSetup.conditionsHint')}</Text>
      <View style={styles.chipGrid}>
        {primary.map((item) => renderChip(item.id, item.label))}
      </View>
      <Text style={styles.sectionHint}>{t('profileSetup.conditionsOther')}</Text>
      <View style={styles.chipGrid}>
        {secondary.map((item) => renderChip(item.id, item.label))}
      </View>
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 8 },
    hint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    sectionHint: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: 4,
    },
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
  });
}
