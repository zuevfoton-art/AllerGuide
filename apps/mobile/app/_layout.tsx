import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { initDb } from '@/src/db/init';
import { useTheme } from '@/src/hooks/use-theme';
import { useThemeStore } from '@/src/store/theme-store';

export default function RootLayout() {
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const { colors, isDark } = useTheme();

  useEffect(() => {
    initDb();
    hydrateTheme();
  }, [hydrateTheme]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </>
  );
}
