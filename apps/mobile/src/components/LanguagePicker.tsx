import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { APP_LOCALES, type AppLocale } from '@/src/i18n/types';
import { useTranslation } from '@/src/store/locale-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

const LOCALE_FLAGS: Record<AppLocale, string> = {
  ru: '🇷🇺',
  en: '🇬🇧',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
};

type LanguagePickerProps = {
  compact?: boolean;
  /** Renders inside a GlassCard without outer card chrome */
  embedded?: boolean;
};

export function LanguagePicker({ compact = false, embedded = false }: LanguagePickerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, compact, embedded), [theme, compact, embedded]);
  const { locale, setLocale, t } = useTranslation();

  return (
    <View style={styles.wrap}>
      {!compact && !embedded ? <Text style={styles.title}>{t('language.title')}</Text> : null}
      <View style={styles.row}>
        {APP_LOCALES.map((code) => {
          const active = locale === code;
          return (
            <Pressable
              key={code}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setLocale(code)}>
              <Text style={styles.flag}>{LOCALE_FLAGS[code]}</Text>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t(`language.${code}` as 'language.ru')}
              </Text>
              {active ? <Ionicons name="checkmark" size={14} color={theme.colors.accent} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme, compact: boolean, embedded: boolean) {
  return StyleSheet.create({
    wrap: {
      ...(embedded
        ? { gap: 10, marginTop: 4 }
        : {
            backgroundColor: colors.card,
            borderRadius: 8,
            padding: compact ? 12 : 16,
            gap: compact ? 8 : 12,
            borderWidth: 1,
            borderColor: colors.border,
          }),
    },
    title: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
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
    flag: { fontSize: 14 },
    chipText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    chipTextActive: { color: colors.accent, fontWeight: '600' },
  });
}
