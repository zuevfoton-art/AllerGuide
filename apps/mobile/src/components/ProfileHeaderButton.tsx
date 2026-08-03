import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listProfiles } from '@/src/services/profile-service';
import { trackEvent } from '@/src/services/analytics-service';
import { useAppStore } from '@/src/store/app-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import type { Profile } from '@/src/types';

export function ProfileHeaderButton() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  useEffect(() => {
    if (!open) return;
    setProfiles(listProfiles());
  }, [open]);

  const selectProfile = (profile: Profile) => {
    if (activeProfileId !== profile.id) {
      setActiveProfile(profile);
      trackEvent('profile_switched', { profile_type: profile.type, source: 'header' });
    }
    setOpen(false);
  };

  const openCreateProfile = () => {
    setOpen(false);
    router.push('/profile-setup?mode=add');
  };

  return (
    <>
      <Pressable
        testID="profile-header-button"
        style={styles.button}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('profileSwitcher.switchTitle')}>
        <Ionicons name="person-circle-outline" size={20} color={theme.colors.accent} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
            accessibilityViewIsModal>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{t('profileSwitcher.switchTitle')}</Text>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}>
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </Pressable>
            </View>

            {profiles.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{t('profileSwitcher.switchEmpty')}</Text>
                <Pressable
                  style={styles.createRow}
                  onPress={openCreateProfile}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.createProfile')}>
                  <Ionicons name="add-circle-outline" size={20} color={theme.colors.accent} />
                  <Text style={styles.createText}>{t('common.createProfile')}</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
                {profiles.map((profile, index) => {
                  const isActive = activeProfileId === profile.id;
                  return (
                    <Pressable
                      key={profile.id}
                      testID={`profile-header-option-${profile.id}`}
                      style={[styles.option, index < profiles.length - 1 && styles.optionBorder]}
                      onPress={() => selectProfile(profile)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      accessibilityLabel={profile.name}>
                      <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
                        {profile.name}
                      </Text>
                      {isActive ? (
                        <Ionicons name="checkmark" size={18} color={theme.colors.accent} />
                      ) : (
                        <View style={styles.optionSpacer} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    button: {
      width: 40,
      height: 40,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      justifyContent: 'center',
      padding: 24,
    },
    sheet: {
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: '70%',
      overflow: 'hidden',
    },
    sheetHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sheetTitle: {
      fontFamily: fonts.serifBold,
      fontSize: 18,
      fontWeight: '700',
      color: colors.head,
    },
    empty: {
      paddingHorizontal: 16,
      paddingVertical: 20,
      gap: 14,
    },
    emptyText: {
      fontFamily: fonts.sans,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    createRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 4,
    },
    createText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.accent,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      minHeight: 52,
    },
    optionBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    optionText: {
      flex: 1,
      fontFamily: fonts.sans,
      fontSize: 15,
      color: colors.text,
    },
    optionTextActive: {
      fontFamily: fonts.sansSemiBold,
      fontWeight: '600',
      color: colors.accent,
    },
    optionSpacer: { width: 18 },
  });
}
