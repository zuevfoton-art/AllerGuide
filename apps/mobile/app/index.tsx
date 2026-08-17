import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { resolveAuthedBootstrapRoute } from '@allerguide/core';
import { AppSplash } from '@/src/components/AppSplash';
import { initDb } from '@/src/db/init';
import {
  isAuthenticated,
  getCurrentUserId,
  restoreAuthSession,
} from '@/src/services/auth-service';
import {
  ensureActiveProfileLoaded,
  listProfiles,
  migrateLegacyProfilesToUser,
  refreshProfilesFromBackend,
} from '@/src/services/profile-service';
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

      async function continueBootstrap() {
        const userId = getCurrentUserId();
        if (userId) migrateLegacyProfilesToUser(userId);

        // Best-effort cloud refresh (local DB already filled by login/restore when online).
        await refreshProfilesFromBackend();
        // Parent (`self`) becomes active when several profiles exist; full row in store.
        ensureActiveProfileLoaded({ preferSelf: true });

        const profiles = listProfiles();
        const scenario = getStoredScenario();
        if (scenario) setScenario(scenario);

        if (!mounted) return;
        setTarget(
          resolveAuthedBootstrapRoute(
            profiles,
            scenario,
            isIntroComplete(),
            isOnboardingComplete(),
          ),
        );
      }

      await restoreAuthSession();
      if (!mounted) return;

      if (!isAuthenticated()) {
        setTarget('/login');
        return;
      }

      await continueBootstrap();
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
