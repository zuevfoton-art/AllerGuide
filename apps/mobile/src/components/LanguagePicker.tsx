import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { APP_LOCALES, type AppLocale } from '@/src/i18n/types';
import { useTranslation } from '@/src/store/locale-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

export const LOCALE_FLAGS: Record<AppLocale, string> = {
  ru: '🇷🇺',
  en: '🇬🇧',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
};

type LanguagePickerProps = {
  /** Compact trigger for auth screens (aligned right) */
  compact?: boolean;
  /** Inside GlassCard — no outer card chrome */
  embedded?: boolean;
  style?: ViewStyle;
};

export function LanguagePicker({ compact = false, embedded = false, style }: LanguagePickerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, compact), [theme, compact]);
  const { locale, setLocale, t } = useTranslation();
  const [open, setOpen] = useState(false);

  const select = (code: AppLocale) => {
    setLocale(code);
    setOpen(false);
  };

  const currentLabel = t(`language.${locale}` as 'language.ru');

  return (
    <>
      <View style={[styles.wrap, compact && styles.wrapCompact, style]}>
        {!compact && !embedded ? <Text style={styles.title}>{t('language.title')}</Text> : null}
        <Pressable
          style={styles.trigger}
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('language.title')}
          accessibilityHint={currentLabel}>
          <Text style={styles.triggerFlag}>{LOCALE_FLAGS[locale]}</Text>
          <Text style={styles.triggerText} numberOfLines={1}>
            {currentLabel}
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.colors.textMuted} />
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{t('language.title')}</Text>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}>
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
              {APP_LOCALES.map((code, index) => {
                const active = locale === code;
                return (
                  <Pressable
                    key={code}
                    style={[styles.option, index < APP_LOCALES.length - 1 && styles.optionBorder]}
                    onPress={() => select(code)}>
                    <Text style={styles.optionFlag}>{LOCALE_FLAGS[code]}</Text>
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {t(`language.${code}` as 'language.ru')}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={18} color={theme.colors.accent} />
                    ) : (
                      <View style={styles.optionSpacer} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles({ colors, fonts }: AppTheme, compact: boolean) {
  return StyleSheet.create({
    wrap: { gap: 10 },
    wrapCompact: { alignSelf: 'flex-end', marginBottom: 4 },
    title: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
      minHeight: 44,
      ...(compact ? { minWidth: 148 } : {}),
    },
    triggerFlag: { fontSize: 18, lineHeight: 22 },
    triggerText: {
      flex: 1,
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      justifyContent: 'center',
      padding: 24,
    },
    sheet: {
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: '70%',
      overflow: 'hidden',
    },
    sheetHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sheetTitle: {
      fontFamily: fonts.serifBold,
      fontSize: 18,
      fontWeight: '700',
      color: colors.head,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      minHeight: 52,
    },
    optionBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    optionFlag: { fontSize: 22, lineHeight: 26, width: 28, textAlign: 'center' },
    optionText: {
      flex: 1,
      fontFamily: fonts.sans,
      fontSize: 15,
      color: colors.text,
    },
    optionTextActive: {
      fontFamily: fonts.sansSemiBold,
      fontWeight: '600',
      color: colors.accent,
    },
    optionSpacer: { width: 18 },
  });
}
