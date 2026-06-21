import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import type { ThemeMode } from '@/src/constants/theme';
import { useTranslation } from '@/src/store/locale-store';

const MODES: {
  key: ThemeMode;
  labelKey: 'theme.light' | 'theme.dark' | 'theme.system';
  icon: 'sunny' | 'moon' | 'phone-portrait';
}[] = [
  { key: 'light', labelKey: 'theme.light', icon: 'sunny' },
  { key: 'dark', labelKey: 'theme.dark', icon: 'moon' },
  { key: 'system', labelKey: 'theme.system', icon: 'phone-portrait' },
];

type ThemeToggleProps = {
  embedded?: boolean;
};

export function ThemeToggle({ embedded = false }: ThemeToggleProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, embedded), [theme, embedded]);
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('theme.title')}</Text>
      <View style={styles.row}>
        {MODES.map((item, index) => {
          const active = theme.mode === item.key;
          return (
            <Pressable
              key={item.key}
              style={[
                styles.seg,
                index < MODES.length - 1 && styles.segBorder,
                active && styles.segActive,
              ]}
              onPress={() => theme.setMode(item.key)}>
              <Ionicons
                name={item.icon}
                size={15}
                color={active ? theme.colors.onAccent : theme.colors.textMuted}
              />
              <Text style={[styles.segText, active && styles.segTextActive]}>{t(item.labelKey)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme, embedded: boolean) {
  return StyleSheet.create({
    wrap: {
      ...(embedded
        ? { gap: 10 }
        : {
            backgroundColor: colors.card,
            borderRadius: 8,
            padding: 16,
            gap: 12,
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
    row: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      overflow: 'hidden',
      backgroundColor: colors.card,
    },
    seg: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 11,
      paddingHorizontal: 6,
    },
    segBorder: { borderRightWidth: 1, borderRightColor: colors.border },
    segActive: { backgroundColor: colors.accent },
    segText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    segTextActive: { color: colors.onAccent },
  });
}
