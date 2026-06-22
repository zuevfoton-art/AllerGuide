import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { resolveBootstrapRoute } from '@allerguide/core';
import { AppSplash } from '@/src/components/AppSplash';
import { initDb } from '@/src/db/init';
import { isAuthenticated, getCurrentUserId } from '@/src/services/auth-service';
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
    initDb();

    if (!isAuthenticated()) {
      setTarget('/login');
      return;
    }

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
  }, [setScenario]);

  if (!target) {
    return <AppSplash />;
  }

  return <Redirect href={target as any} />;
}
