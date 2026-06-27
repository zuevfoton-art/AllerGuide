import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { resolveBootstrapRoute } from '@allerguide/core';
import { AppSplash } from '@/src/components/AppSplash';
import { initDb } from '@/src/db/init';
import { isAuthenticated, getCurrentUserId, loginWithReplitExchange } from '@/src/services/auth-service';
import { listProfiles, migrateLegacyProfilesToUser } from '@/src/services/profile-service';
import {
  getStoredScenario,
  isIntroComplete,
  isOnboardingComplete,
  markIntroComplete,
  markOnboardingComplete,
} from '@/src/services/settings-service';
import { useAppStore } from '@/src/store/app-store';

type BootstrapRoute = '/login' | '/onboarding-intro' | '/onboarding' | '/profile-setup' | '/(tabs)/home';

export default function Index() {
  const [target, setTarget] = useState<BootstrapRoute | null>(null);
  const setScenario = useAppStore((s) => s.setScenario);

  useEffect(() => {
    initDb();

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

      // Returning user: has profiles in local DB (synced from server or created
      // on this device). Skip intro and onboarding — go straight to the app.
      // This covers the case where the user logs in on a new device and the
      // local "introComplete" / "onboardingComplete" flags are not yet set.
      const isReturningUser = profiles.length > 0;
      if (isReturningUser) {
        markIntroComplete();
        markOnboardingComplete();
        setTarget(resolveBootstrapRoute(profiles, scenario, true));
        return;
      }

      // Brand-new user: no profiles yet — show the intro / onboarding flow.
      if (!isIntroComplete()) {
        setTarget('/onboarding-intro');
        return;
      }

      setTarget(resolveBootstrapRoute(profiles, scenario, isOnboardingComplete()));
    }

    if (hasReplitCallback) {
      if (window.history) window.history.replaceState({}, '', '/');
      loginWithReplitExchange().then((result) => {
        if (!result.ok) {
          setTarget('/login');
          return;
        }
        continueBootstrap();
      });
      return;
    }

    if (!isAuthenticated()) {
      setTarget('/login');
      return;
    }

    continueBootstrap();
  }, [setScenario]);

  if (!target) {
    return <AppSplash />;
  }

  return <Redirect href={target as any} />;
}
