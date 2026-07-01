import { Stack, usePathname } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { InteractionManager, Platform, StyleSheet, View, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { initDb } from '@/src/db/init';
import { warmAllergenCatalogCache } from '@/src/services/allergen-catalog-service';
import { initI18n } from '@/src/i18n';
import { useAppFonts } from '@/src/hooks/use-fonts';
import { useTheme } from '@/src/hooks/use-theme';
import { useResponsiveLayout } from '@/src/hooks/use-responsive-layout';
import { initAnalytics, trackScreen } from '@/src/services/analytics-service';
import { initErrorReporting } from '@/src/services/error-reporting';
import { reconcileAllReminders } from '@/src/services/reminder-reconcile-service';
import { registerNotificationNavigation } from '@/src/services/notification-navigation-service';
import { useThemeStore } from '@/src/store/theme-store';
import { useLocaleStore } from '@/src/store/locale-store';
import {
  logStartupMetrics,
  markStartupPhase,
} from '@/src/services/startup-metrics';

// NOTE: react-native-quick-crypto was removed. Its native install() crashed the
// Android app at launch (a native/JNI abort that a JS try/catch cannot catch,
// independent of the New Architecture flag). Password hashing now uses the
// pure-JS `@noble/hashes` in @allerguide/core, so no native crypto module is
// loaded at startup.

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
    markStartupPhase('layout_mount');

    // Each startup step is independent — a failure in one subsystem must never
    // block the whole app from rendering.
    const safe = (label: string, fn: () => void) => {
      try {
        fn();
      } catch (error) {
        console.warn(`[startup] ${label} failed:`, error);
      }
    };

    safe('initI18n', initI18n);
    safe('initAnalytics', initAnalytics);
    safe('initErrorReporting', initErrorReporting);

    // Storage hydration is async on web (IndexedDB). Gate rendering on it so
    // screens never read from an empty cache before hydration completes.
    void (async () => {
      markStartupPhase('init_db_start');
      try {
        await initDb();
      } catch (error) {
        console.warn('[startup] initDb failed:', error);
      }
      if (!mounted) return;
      safe('hydrateTheme', hydrateTheme);
      safe('hydrateLocale', hydrateLocale);
      markStartupPhase('db_ready');
      setDbReady(true);
      void reconcileAllReminders();

      const deferBackgroundWarmup = () => {
        safe('warmAllergenCatalogCache', warmAllergenCatalogCache);
      };

      if (Platform.OS === 'web') {
        deferBackgroundWarmup();
      } else {
        InteractionManager.runAfterInteractions(deferBackgroundWarmup);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [hydrateTheme, hydrateLocale]);

  useEffect(() => {
    if (!appReady) return;
    markStartupPhase('app_ready');
    logStartupMetrics();
  }, [appReady]);

  useEffect(() => {
    if (appReady && pathname) trackScreen(pathname);
  }, [appReady, pathname]);

  useEffect(() => {
    if (!appReady || Platform.OS === 'web') return;
    const unsubscribeNavigation = registerNotificationNavigation();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void reconcileAllReminders();
      }
    });
    return () => {
      unsubscribeNavigation();
      subscription.remove();
    };
  }, [appReady]);

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
