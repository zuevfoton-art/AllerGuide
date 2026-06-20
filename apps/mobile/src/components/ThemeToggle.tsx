import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import type { ThemeMode } from '@/src/constants/theme';
import { useTranslation } from '@/src/store/locale-store';

const MODES: { key: ThemeMode; labelKey: 'theme.light' | 'theme.dark' | 'theme.system'; icon: 'sunny' | 'moon' | 'phone-portrait' }[] = [
  { key: 'light', labelKey: 'theme.light', icon: 'sunny' },
  { key: 'dark', labelKey: 'theme.dark', icon: 'moon' },
  { key: 'system', labelKey: 'theme.system', icon: 'phone-portrait' },
];

export function ThemeToggle() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('theme.title')}</Text>
      <View style={styles.row}>
        {MODES.map((item) => {
          const active = theme.mode === item.key;
          return (
            <Pressable
              key={item.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => theme.setMode(item.key)}>
              <Ionicons
                name={item.icon}
                size={16}
                color={active ? theme.colors.accent : theme.colors.textSecondary}
              />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(item.labelKey)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles({ colors }: AppTheme) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: { fontSize: 15, fontWeight: '700', color: colors.text },
    row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: colors.bg,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    chipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    chipTextActive: { color: colors.accent },
  });
}
