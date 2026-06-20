import { useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import {
  createShadows,
  getThemeColors,
  type ThemeColors,
  type ThemeMode,
} from '@/src/constants/theme';
import { useThemeStore } from '@/src/store/theme-store';

export type AppTheme = {
  colors: ThemeColors;
  shadows: ReturnType<typeof createShadows>;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleDark: () => void;
};

export function useTheme(): AppTheme {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const toggleDark = useThemeStore((s) => s.toggleDark);
  const systemScheme = useColorScheme();

  return useMemo(() => {
    const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
    const colors = getThemeColors(isDark);
    return {
      colors,
      shadows: createShadows(colors),
      isDark,
      mode,
      setMode,
      toggleDark,
    };
  }, [mode, setMode, systemScheme, toggleDark]);
}

export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: AppTheme) => T,
): T {
  const theme = useTheme();
  return useMemo(() => StyleSheet.create(factory(theme)), [theme, factory]);
}
