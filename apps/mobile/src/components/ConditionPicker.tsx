import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ALLERGY_CONDITION_TYPES, type AllergyConditionId } from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

interface ConditionPickerProps {
  selected: AllergyConditionId[];
  onChange: (selected: AllergyConditionId[]) => void;
}

export function ConditionPicker({ selected, onChange }: ConditionPickerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const toggle = (id: AllergyConditionId) => {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.chipGrid}>
        {ALLERGY_CONDITION_TYPES.map((item) => {
          const active = selected.includes(item.id);
          return (
            <Pressable
              key={item.id}
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
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 8 },
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
