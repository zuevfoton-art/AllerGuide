import { Stack, usePathname } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { initDb } from '@/src/db/init';
import { initI18n } from '@/src/i18n';
import { useAppFonts } from '@/src/hooks/use-fonts';
import { useTheme } from '@/src/hooks/use-theme';
import { useResponsiveLayout } from '@/src/hooks/use-responsive-layout';
import { initAnalytics, trackScreen } from '@/src/services/analytics-service';
import { initErrorReporting } from '@/src/services/error-reporting';
import { useThemeStore } from '@/src/store/theme-store';
import { useLocaleStore } from '@/src/store/locale-store';

// react-native-quick-crypto (0.x, Bridge/JSI) polyfills the global `crypto` used
// for native backup encryption. Its install() can throw on launch (the 0.x JSI
// build is only best-effort on the New Architecture, and fails if the native
// module isn't linked). Guard it so a crypto-polyfill failure NEVER crashes the
// app at startup — web has Web Crypto, and backup encryption degrades gracefully.
// (ES imports are evaluated before this runs, so ordering is unaffected.)
if (Platform.OS !== 'web') {
  try {
    // Lazy require so the web bundle never loads the native module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('react-native-quick-crypto') as { install: () => void }).install();
  } catch (error) {
    console.warn('[crypto] react-native-quick-crypto install skipped:', error);
  }
}

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
  const fontsLoaded = useAppFonts();
  const [dbReady, setDbReady] = useState(false);
  const appReady = dbReady && fontsLoaded;

  useEffect(() => {
    let mounted = true;
    initI18n();
    initAnalytics();
    initErrorReporting();

    // Storage hydration is async on web (IndexedDB). Gate rendering on it so
    // screens never read from an empty cache before hydration completes.
    void (async () => {
      await initDb();
      if (!mounted) return;
      hydrateTheme();
      hydrateLocale();
      setDbReady(true);
    })();

    return () => {
      mounted = false;
    };
  }, [hydrateTheme, hydrateLocale]);

  useEffect(() => {
    if (appReady && pathname) trackScreen(pathname);
  }, [appReady, pathname]);

  return (
    <ErrorBoundary>
      <WebShell>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {appReady ? (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg, flex: 1 },
            }}
          />
        ) : (
          <View style={[styles.loading, { backgroundColor: colors.bg }]} />
        )}
      </WebShell>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1 },
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
