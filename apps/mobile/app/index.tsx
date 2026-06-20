import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { resolveBootstrapRoute } from '@allerguide/core';
import { initDb } from '@/src/db/init';
import { useTheme } from '@/src/hooks/use-theme';
import { isAuthenticated, getCurrentUserId } from '@/src/services/auth-service';
import { listProfiles, migrateLegacyProfilesToUser } from '@/src/services/profile-service';
import {
  getStoredScenario,
  isOnboardingComplete,
} from '@/src/services/settings-service';
import { useAppStore } from '@/src/store/app-store';

type BootstrapRoute = '/login' | '/onboarding' | '/profile-setup' | '/(tabs)/home';

export default function Index() {
  const { colors } = useTheme();
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
    setTarget(resolveBootstrapRoute(profiles, scenario, isOnboardingComplete()));
  }, [setScenario]);

  if (!target) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return <Redirect href={target} />;
}
