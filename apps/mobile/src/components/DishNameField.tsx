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
import type { DishSuggestion } from '@allerguide/core';
import { density, radii, WEB_INPUT_FONT_SIZE } from '@/src/constants/layout';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

type Props = {
  value: string;
  placeholder?: string;
  label: string;
  suggestions: DishSuggestion[];
  loading?: boolean;
  testID?: string;
  inputTestID?: string;
  multiline?: boolean;
  onChange: (value: string) => void;
  onSelect: (suggestion: DishSuggestion) => void;
};

export function DishNameField({
  value,
  placeholder,
  label,
  suggestions,
  loading,
  testID = 'dish-name-field',
  inputTestID = 'diary-wizard-field',
  multiline,
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
        style={[styles.input, multiline ? styles.multiline : null]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel={label}
        autoCorrect={false}
        autoCapitalize="none"
        multiline={multiline}
      />
      {loading ? (
        <View style={styles.loadingRow} testID="dish-searching">
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={styles.loadingText}>{t('diaryWizard.dishSearching')}</Text>
        </View>
      ) : null}
      {suggestions.length > 0 ? (
        <View style={styles.suggestions} testID="dish-suggestions">
          {suggestions.map((item) => (
            <Pressable
              key={`${item.source}-${item.id}`}
              style={styles.suggestion}
              onPress={() => onSelect(item)}
              hitSlop={8}
              accessibilityRole="button"
              testID={`dish-suggestion-${item.id}`}>
              <Text style={styles.suggestionTitle}>{item.name}</Text>
              <Text style={styles.suggestionMeta}>
                {item.source === 'local'
                  ? t('diaryWizard.dishSuggestionLocal')
                  : t('diaryWizard.dishSuggestionCatalog')}
                {item.ingredientsPreview ? ` · ${item.ingredientsPreview}` : ''}
              </Text>
            </Pressable>
          ))}
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
    multiline: { minHeight: 88, textAlignVertical: 'top' },
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
