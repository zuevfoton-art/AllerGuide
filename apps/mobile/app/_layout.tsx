import { Stack, usePathname } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { initDb } from '@/src/db/init';
import { initI18n } from '@/src/i18n';
import { useTheme } from '@/src/hooks/use-theme';
import { useResponsiveLayout } from '@/src/hooks/use-responsive-layout';
import { initAnalytics, trackScreen } from '@/src/services/analytics-service';
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

export default function RootLayout() {
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const hydrateLocale = useLocaleStore((s) => s.hydrate);
  const { colors, isDark } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    initI18n();
    initAnalytics();
    initErrorReporting();
    initDb();
    hydrateTheme();
    hydrateLocale();
  }, [hydrateTheme, hydrateLocale]);

  useEffect(() => {
    if (pathname) trackScreen(pathname);
  }, [pathname]);

  return (
    <ErrorBoundary>
      <WebShell>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg, flex: 1 },
          }}
        />
      </WebShell>
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
});
