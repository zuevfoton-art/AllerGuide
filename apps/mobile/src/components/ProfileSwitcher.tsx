import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { listProfiles } from '@/src/services/profile-service';
import { useAppStore } from '@/src/store/app-store';
import { colors } from '@/src/constants/theme';

import type { Profile } from '@/src/types';

export function ProfileSwitcher() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const setActiveProfileId = useAppStore((s) => s.setActiveProfileId);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  useEffect(() => {
    setProfiles(listProfiles());
  }, [activeProfileId]);

  if (profiles.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {profiles.map((profile) => (
          <Pressable
            key={profile.id}
            style={[styles.chip, activeProfileId === profile.id && styles.active]}
            onPress={() => {
              setActiveProfileId(profile.id);
              setActiveProfile(profile);
            }}>
            <View style={[styles.avatar, activeProfileId === profile.id && styles.avatarActive]}>
              <Text style={[styles.avatarText, activeProfileId === profile.id && styles.avatarTextActive]}>
                {profile.name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <Text style={[styles.chipText, activeProfileId === profile.id && styles.chipTextActive]}>
              {profile.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  active: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActive: { backgroundColor: colors.accent },
  avatarText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  avatarTextActive: { color: '#fff' },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.accent },
});
