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

const LOCALE_CODES: Record<AppLocale, string> = {
  ru: 'RU',
  en: 'EN',
  es: 'ES',
  fr: 'FR',
  de: 'DE',
  it: 'IT',
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
              {compact ? (
                <Text style={[styles.chipCode, active && styles.chipCodeActive]}>
                  {LOCALE_CODES[code]}
                </Text>
              ) : (
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {t(`language.${code}` as 'language.ru')}
                </Text>
              )}
              {active && !compact ? <Ionicons name="checkmark" size={14} color={theme.colors.accent} /> : null}
              {active && compact ? <Ionicons name="checkmark" size={11} color={theme.colors.accent} /> : null}
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
            padding: compact ? 10 : 16,
            gap: compact ? 6 : 12,
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
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: compact ? 4 : 6,
      paddingVertical: compact ? 5 : 7,
      paddingHorizontal: compact ? 7 : 10,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    chipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    flag: { fontSize: compact ? 13 : 14 },
    chipText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    chipTextActive: { color: colors.accent, fontWeight: '600' },
    chipCode: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.3,
    },
    chipCodeActive: { color: colors.accent },
  });
}
