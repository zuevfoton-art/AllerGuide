import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listProfiles } from '@/src/services/profile-service';
import { trackEvent } from '@/src/services/analytics-service';
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
    trackEvent('profile_switched', { profile_type: profile.type });
  };

  if (profiles.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.seg}>
        {profiles.map((profile) => {
          const isActive = activeProfileId === profile.id;
          return (
            <Pressable
              key={profile.id}
              style={[styles.segItem, isActive && styles.segItemActive]}
              onPress={() => handleProfilePress(profile)}>
              <Text style={[styles.segText, isActive && styles.segTextActive]}>{profile.name}</Text>
            </Pressable>
          );
        })}
        <Pressable style={styles.segAdd} onPress={() => router.push('/profile-setup?mode=add')}>
          <Ionicons name="add" size={18} color={theme.colors.accent} />
        </Pressable>
      </View>

      {activeProfileId ? (
        <View style={styles.footer}>
          <Text style={styles.hint}>{t('profileSwitcher.hint')}</Text>
          <Pressable
            onPress={() => router.push('/profile' as any)}
            accessibilityRole="button"
            style={styles.manageLink}>
            <Text style={styles.manageLinkText}>{t('profileSwitcher.manage')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function createStyles({ colors, shadows, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 6 },
    seg: {
      flexDirection: 'row',
      backgroundColor: colors.mint,
      borderRadius: 6,
      padding: 3,
      gap: 0,
    },
    segItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9,
      paddingHorizontal: 8,
      borderRadius: 4,
    },
    segItemActive: {
      backgroundColor: colors.card,
      ...(shadows.sm as object),
    },
    segText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    segTextActive: {
      color: colors.text,
    },
    segAdd: {
      width: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 16,
    },
    footer: { gap: 4 },
    manageLink: { alignSelf: 'flex-start', paddingVertical: 2 },
    manageLinkText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.accent,
    },
  });
}
