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
};

export function LanguagePicker({ compact = false }: LanguagePickerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, compact), [theme, compact]);
  const { locale, setLocale, t } = useTranslation();

  return (
    <View style={styles.wrap}>
      {!compact ? <Text style={styles.title}>{t('language.title')}</Text> : null}
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
              {active ? <Ionicons name="checkmark" size={14} color={theme.colors.teal} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles({ colors }: AppTheme, compact: boolean) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: compact ? 12 : 16,
      gap: compact ? 8 : 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: { fontSize: 15, fontWeight: '700', color: colors.text },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 14,
      backgroundColor: colors.bg,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    chipActive: {
      borderColor: colors.teal,
      backgroundColor: colors.tealLight,
    },
    flag: { fontSize: 14 },
    chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    chipTextActive: { color: colors.teal, fontWeight: '700' },
  });
}
