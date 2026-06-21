import { Stack } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  SourceSerif4_600SemiBold,
  SourceSerif4_700Bold,
} from '@expo-google-fonts/source-serif-4';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { initDb } from '@/src/db/init';
import { initI18n } from '@/src/i18n';
import { useTheme } from '@/src/hooks/use-theme';
import { useResponsiveLayout } from '@/src/hooks/use-responsive-layout';
import { initAnalytics } from '@/src/services/analytics-service';
import { initErrorReporting } from '@/src/services/error-reporting';
import { useThemeStore } from '@/src/store/theme-store';
import { useLocaleStore } from '@/src/store/locale-store';

function WebShell({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const { shellMaxWidth, isWeb } = useResponsiveLayout();

  if (!isWeb) return children;

  return (
    <View style={[styles.webOuter, { backgroundColor: colors.border }]}>
      <View style={[styles.webInner, { maxWidth: shellMaxWidth, backgroundColor: colors.bg }]}>
        {children}
      </View>
    </View>
  );
}

function FontGate({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SourceSerif4_600SemiBold,
    SourceSerif4_700Bold,
  });

  if (!loaded) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return children;
}

export default function RootLayout() {
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const hydrateLocale = useLocaleStore((s) => s.hydrate);
  const { colors, isDark } = useTheme();

  useEffect(() => {
    initI18n();
    initAnalytics();
    initErrorReporting();
    initDb();
    hydrateTheme();
    hydrateLocale();
  }, [hydrateTheme, hydrateLocale]);

  return (
    <ErrorBoundary>
      <FontGate>
        <WebShell>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg, flex: 1 },
            }}
          />
        </WebShell>
      </FontGate>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { minHeight: '100dvh' as unknown as number } : null),
  },
  webInner: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' ? { minHeight: '100dvh' as unknown as number } : null),
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
