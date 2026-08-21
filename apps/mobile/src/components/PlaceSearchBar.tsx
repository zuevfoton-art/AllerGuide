import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PlaceAutocompleteSuggestion } from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

interface PlaceSearchBarProps {
  value: string;
  suggestions: PlaceAutocompleteSuggestion[];
  loading?: boolean;
  error?: string | null;
  sourceLabel?: string | null;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onSelectSuggestion: (suggestion: PlaceAutocompleteSuggestion) => void;
  onClear: () => void;
}

export function PlaceSearchBar({
  value,
  suggestions,
  loading,
  error,
  sourceLabel,
  onChange,
  onSubmit,
  onSelectSuggestion,
  onClear,
}: PlaceSearchBarProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <View style={styles.wrap} testID="place-search-bar">
      <View style={styles.inputRow}>
        <Ionicons name="search" size={16} color={theme.colors.textMuted} />
        <TextInput
          value={value}
          onChangeText={onChange}
          onSubmitEditing={() => onSubmit(value)}
          placeholder={t('map.placeSearchPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel={t('map.placeSearchPlaceholder')}
          testID="place-search-input"
        />
        {loading ? <ActivityIndicator size="small" color={theme.colors.accent} /> : null}
        {value ? (
          <Pressable
            onPress={onClear}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            testID="place-search-clear">
            <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {sourceLabel ? <Text style={styles.source}>{sourceLabel}</Text> : null}
      {suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion.placeId}
              style={styles.suggestion}
              onPress={() => onSelectSuggestion(suggestion)}
              hitSlop={8}
              accessibilityRole="button"
              testID={`place-suggestion-${suggestion.placeId}`}>
              <Text style={styles.suggestionTitle}>{suggestion.primaryText}</Text>
              {suggestion.secondaryText ? (
                <Text style={styles.suggestionMeta}>{suggestion.secondaryText}</Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 6 },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 44,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
    },
    input: {
      flex: 1,
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.text,
      paddingVertical: 8,
    },
    error: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.danger,
    },
    source: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
    },
    suggestions: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    suggestion: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    suggestionTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      color: colors.text,
    },
    suggestionMeta: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
    },
  });
}
