import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import type { AsitScheduleStage } from '@allerguide/core';
import { DateTimeField } from '@/src/components/DateTimeField';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useUiStyles } from '@/src/hooks/use-glass-styles';

type Props = {
  stages: AsitScheduleStage[];
  doseLabel: string;
  dosePlaceholder: string;
  addRowLabel: string;
  stageLabel: (index: number) => string;
  fromLabel: string;
  toLabel: string;
  onChange: (stages: AsitScheduleStage[]) => void;
  testID?: string;
};

const EMPTY_STAGE: AsitScheduleStage = { from: '', to: '', dose: '' };

function isStageFilled(stage: AsitScheduleStage): boolean {
  return Boolean(stage.from.trim() || stage.to.trim() || stage.dose.trim());
}

/**
 * Editable schedule stages with «+» to the right of a filled stage card.
 */
export function ScheduleStagesEditor({
  stages,
  doseLabel,
  dosePlaceholder,
  addRowLabel,
  stageLabel,
  fromLabel,
  toLabel,
  onChange,
  testID,
}: Props) {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const rows = stages.length > 0 ? stages : [EMPTY_STAGE];

  const update = (index: number, patch: Partial<AsitScheduleStage>) => {
    const next = rows.map((stage, i) => (i === index ? { ...stage, ...patch } : stage));
    onChange(next);
  };

  const addAfter = (index: number) => {
    const next = [...rows];
    next.splice(index + 1, 0, { ...EMPTY_STAGE });
    onChange(next);
  };

  return (
    <View style={styles.wrap} testID={testID}>
      {rows.map((stage, index) => (
        <View key={`stage-${index}`} style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.stageLabel}>{stageLabel(index)}</Text>
            {isStageFilled(stage) ? (
              <Pressable
                style={styles.addBtn}
                onPress={() => addAfter(index)}
                accessibilityRole="button"
                accessibilityLabel={addRowLabel}
                testID={testID ? `${testID}-add-${index}` : undefined}>
                <Ionicons name="add" size={20} color={theme.colors.accent} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <DateTimeField
                label={fromLabel}
                value={stage.from}
                onChange={(from) => update(index, { from })}
                mode="date"
                minYear={2020}
              />
            </View>
            <View style={styles.dateField}>
              <DateTimeField
                label={toLabel}
                value={stage.to}
                onChange={(to) => update(index, { to })}
                mode="date"
                minYear={2020}
              />
            </View>
          </View>
          <Text style={[ui.sectionLabel, styles.doseLabel]}>{doseLabel}</Text>
          <TextInput
            style={styles.input}
            value={stage.dose}
            onChangeText={(dose) => update(index, { dose })}
            placeholder={dosePlaceholder}
            placeholderTextColor={theme.colors.textMuted}
            testID={testID ? `${testID}-dose-${index}` : undefined}
          />
        </View>
      ))}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 10 },
    card: {
      gap: 8,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    cardHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    stageLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    addBtn: {
      width: 36,
      height: 36,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateRow: { flexDirection: 'row', gap: 8 },
    dateField: { flex: 1 },
    doseLabel: { marginTop: 4 },
    input: {
      backgroundColor: colors.bg,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.borderInput,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      fontFamily: fonts.sans,
      color: colors.text,
    },
  });
}
