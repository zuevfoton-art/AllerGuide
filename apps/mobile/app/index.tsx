import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { initDb } from '@/src/db/init';
import { listProfiles } from '@/src/services/profile-service';
import { colors } from '@/src/constants/theme';

export default function Index() {
  const [target, setTarget] = useState<'/(tabs)/home' | '/onboarding' | null>(null);

  useEffect(() => {
    initDb();
    const profiles = listProfiles();
    setTarget(profiles.length > 0 ? '/(tabs)/home' : '/onboarding');
  }, []);

  if (!target) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return <Redirect href={target} />;
}
