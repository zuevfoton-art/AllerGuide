import { useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { MedicineCard } from '@allerguide/core';
import { formatMedicineSuggestionMeta } from '@allerguide/core';
import { density, radii, WEB_INPUT_FONT_SIZE } from '@/src/constants/layout';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

type Props = {
  value: string;
  placeholder?: string;
  label: string;
  suggestions: MedicineCard[];
  loading?: boolean;
  testID?: string;
  inputTestID?: string;
  onChange: (value: string) => void;
  onSelect: (card: MedicineCard) => void;
};

export function MedicineNameField({
  value,
  placeholder,
  label,
  suggestions,
  loading,
  testID = 'diary-medicine-name-field',
  inputTestID = 'diary-wizard-field',
  onChange,
  onSelect,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <View style={styles.wrap} testID={testID}>
      <TextInput
        testID={inputTestID}
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel={label}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {loading ? (
        <View style={styles.loadingRow} testID="diary-medicine-searching">
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={styles.loadingText}>{t('diaryWizard.medicineSearching')}</Text>
        </View>
      ) : null}
      {suggestions.length > 0 ? (
        <View style={styles.suggestions} testID="diary-medicine-suggestions">
          {suggestions.map((card) => {
            const meta = formatMedicineSuggestionMeta(card);
            return (
              <Pressable
                key={`${card.name}-${card.strength}-${card.form}`}
                style={styles.suggestion}
                onPress={() => onSelect(card)}
                hitSlop={8}
                accessibilityRole="button"
                testID={`diary-medicine-suggestion-${card.name}`}>
                <Text style={styles.suggestionTitle}>{card.name}</Text>
                {meta ? <Text style={styles.suggestionMeta}>{meta}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 8 },
    input: {
      backgroundColor: colors.card,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.borderInput,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: density.tapMinHeight,
      fontSize: Platform.OS === 'web' ? WEB_INPUT_FONT_SIZE : 15,
      fontFamily: fonts.sans,
      color: colors.text,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    loadingText: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
    },
    suggestions: {
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    suggestion: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: density.tapMinHeight,
      justifyContent: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    suggestionTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    suggestionMeta: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
  });
}
