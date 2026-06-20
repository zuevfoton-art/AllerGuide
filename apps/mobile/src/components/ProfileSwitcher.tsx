import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listProfiles } from '@/src/services/profile-service';
import { useAppStore } from '@/src/store/app-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import type { Profile } from '@/src/types';

export function ProfileSwitcher() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const setActiveProfileId = useAppStore((s) => s.setActiveProfileId);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  useEffect(() => {
    const nextProfiles = listProfiles();
    setProfiles(nextProfiles);

    if (nextProfiles.length === 0) return;

    const activeExists = nextProfiles.some((profile) => profile.id === activeProfileId);
    if (!activeProfileId || !activeExists) {
      const first = nextProfiles[0];
      setActiveProfileId(first.id);
      setActiveProfile(first);
    }
  }, [activeProfileId, setActiveProfile, setActiveProfileId]);

  const handleProfilePress = (profile: Profile) => {
    if (activeProfileId === profile.id) {
      router.push({ pathname: '/profile-edit', params: { id: String(profile.id) } });
      return;
    }

    setActiveProfileId(profile.id);
    setActiveProfile(profile);
  };

  if (profiles.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {profiles.map((profile) => {
          const isActive = activeProfileId === profile.id;
          return (
            <Pressable
              key={profile.id}
              style={[styles.chip, isActive && styles.active]}
              onPress={() => handleProfilePress(profile)}>
              <View style={[styles.avatar, isActive && styles.avatarActive]}>
                <Text style={[styles.avatarText, isActive && styles.avatarTextActive]}>
                  {profile.name?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{profile.name}</Text>
              {isActive ? (
                <Ionicons name="create-outline" size={14} color={theme.colors.teal} />
              ) : null}
            </Pressable>
          );
        })}

        <Pressable style={styles.addChip} onPress={() => router.push('/profile-setup')}>
          <Ionicons name="add" size={18} color={theme.colors.teal} />
          <Text style={styles.addChipText}>{t('profileSwitcher.add')}</Text>
        </Pressable>
      </View>

      {activeProfileId ? (
        <Text style={styles.hint}>{t('profileSwitcher.hint')}</Text>
      ) : null}
    </View>
  );
}

function createStyles({ colors }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 6 },
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
      borderColor: colors.teal,
      backgroundColor: colors.tealLight,
    },
    avatar: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarActive: { backgroundColor: colors.teal },
    avatarText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    avatarTextActive: { color: colors.onAccent },
    chipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    chipTextActive: { color: colors.teal },
    addChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.tealLight,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.teal,
    },
    addChipText: { fontSize: 14, fontWeight: '700', color: colors.teal },
    hint: { fontSize: 12, color: colors.textMuted, lineHeight: 16 },
  });
}
