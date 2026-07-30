import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useMemo } from 'react';
import {
  insertScheduleLineAfter,
  normalizeScheduleLines,
  updateScheduleLine,
} from '@allerguide/core';

type Props = {
  lines: string[] | undefined;
  notesFallback?: string;
  placeholder: string;
  addRowLabel: string;
  onChange: (lines: string[]) => void;
  testID?: string;
};

/**
 * Multi-row «схема приёма»: one TextInput per line, «+» to the right of a filled row.
 */
export function ScheduleLinesEditor({
  lines,
  notesFallback,
  placeholder,
  addRowLabel,
  onChange,
  testID,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const rows = normalizeScheduleLines(lines, notesFallback);

  return (
    <View style={styles.wrap} testID={testID}>
      {rows.map((line, index) => {
        const filled = line.trim().length > 0;
        return (
          <View key={`schedule-line-${index}`} style={styles.row}>
            <TextInput
              style={styles.input}
              value={line}
              onChangeText={(value) => onChange(updateScheduleLine(rows, index, value))}
              placeholder={placeholder}
              placeholderTextColor={theme.colors.textMuted}
              multiline
              textAlignVertical="top"
              testID={testID ? `${testID}-row-${index}` : undefined}
            />
            {filled ? (
              <Pressable
                style={styles.addBtn}
                onPress={() => onChange(insertScheduleLineAfter(rows, index))}
                accessibilityRole="button"
                accessibilityLabel={addRowLabel}
                testID={testID ? `${testID}-add-${index}` : undefined}>
                <Ionicons name="add" size={22} color={theme.colors.accent} />
              </Pressable>
            ) : (
              <View style={styles.addBtnSpacer} />
            )}
          </View>
        );
      })}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 8 },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    input: {
      flex: 1,
      minHeight: 44,
      borderWidth: 1,
      borderColor: colors.borderInput,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: fonts.sans,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.card,
    },
    addBtn: {
      width: 44,
      height: 44,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    addBtnSpacer: { width: 44, height: 44 },
  });
}
