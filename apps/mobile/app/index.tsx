import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { resolveBootstrapRoute } from '@allerguide/core';
import { initDb } from '@/src/db/init';
import { listProfiles } from '@/src/services/profile-service';
import {
  getStoredScenario,
  isOnboardingComplete,
} from '@/src/services/settings-service';
import { useAppStore } from '@/src/store/app-store';
import { colors } from '@/src/constants/theme';

export default function Index() {
  const [target, setTarget] = useState<'/(tabs)/home' | '/onboarding' | '/profile-setup' | null>(null);
  const setScenario = useAppStore((s) => s.setScenario);

  useEffect(() => {
    initDb();
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
