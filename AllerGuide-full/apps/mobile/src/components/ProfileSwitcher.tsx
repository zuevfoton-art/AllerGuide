import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { listProfiles } from '@/src/services/profile-service';
import { useAppStore } from '@/src/store/app-store';
import { colors } from '@/src/constants/theme';

export function ProfileSwitcher() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const setActiveProfileId = useAppStore((s) => s.setActiveProfileId);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  useEffect(() => {
    listProfiles().then(setProfiles);
  }, [activeProfileId]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Активный профиль</Text>
      <View style={styles.row}>
        {profiles.map((profile) => (
          <Pressable
            key={profile.id}
            style={[styles.chip, activeProfileId === profile.id && styles.active]}
            onPress={() => {
              setActiveProfileId(profile.id);
              setActiveProfile(profile);
            }}>
            <Text>{profile.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { color: colors.forest, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  active: { borderWidth: 2, borderColor: colors.green },
});
