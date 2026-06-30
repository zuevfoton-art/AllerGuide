import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { resolveBootstrapRoute } from '@allerguide/core';
import { AppSplash } from '@/src/components/AppSplash';
import { initDb } from '@/src/db/init';
import {
  isAuthenticated,
  getCurrentUserId,
  loginWithReplitExchange,
  restoreAuthSession,
} from '@/src/services/auth-service';
import { listProfiles, migrateLegacyProfilesToUser } from '@/src/services/profile-service';
import {
  getStoredScenario,
  isIntroComplete,
  isOnboardingComplete,
} from '@/src/services/settings-service';
import { useAppStore } from '@/src/store/app-store';

type BootstrapRoute = '/login' | '/onboarding-intro' | '/onboarding' | '/profile-setup' | '/(tabs)/home';

export default function Index() {
  const [target, setTarget] = useState<BootstrapRoute | null>(null);
  const setScenario = useAppStore((s) => s.setScenario);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      await initDb();
      if (!mounted) return;

      const isWeb = Platform.OS === 'web';
      const hasReplitCallback =
        isWeb &&
        typeof window !== 'undefined' &&
        window.location.search.includes('replit_auth=1');

      function continueBootstrap() {
        const userId = getCurrentUserId();
        if (userId) migrateLegacyProfilesToUser(userId);

        const profiles = listProfiles();
        const scenario = getStoredScenario();
        if (scenario) setScenario(scenario);

        if (!isIntroComplete()) {
          setTarget('/onboarding-intro');
          return;
        }

        setTarget(resolveBootstrapRoute(profiles, scenario, isOnboardingComplete()));
      }

      if (hasReplitCallback) {
        if (window.history) window.history.replaceState({}, '', '/');
        const result = await loginWithReplitExchange();
        if (!mounted) return;
        if (!result.ok) {
          setTarget('/login');
          return;
        }
        continueBootstrap();
        return;
      }

      await restoreAuthSession();
      if (!mounted) return;

      if (!isAuthenticated()) {
        setTarget('/login');
        return;
      }

      continueBootstrap();
    })();

    return () => {
      mounted = false;
    };
  }, [setScenario]);

  if (!target) {
    return <AppSplash />;
  }

  return <Redirect href={target as any} />;
}
