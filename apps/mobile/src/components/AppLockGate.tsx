import { useEffect, useState, type ReactNode } from 'react';
import { AppState, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { parseAllergies } from '@allerguide/core';
import { isAppLockEnabled, requireAppUnlock } from '@/src/services/app-lock-service';
import { getEmergencyNumber, listEmergencyContacts } from '@/src/services/sos-service';
import { useAppStore } from '@/src/store/app-store';
import { useTranslation } from '@/src/store/locale-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { fontSizes } from '@/src/constants/typography';

type Props = {
  children: ReactNode;
};

export function AppLockGate({ children }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const [locked, setLocked] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const lockReason = t('settings.appLockTitle');
  const profile = useAppStore((s) => s.activeProfile);
  const allergies = profile ? parseAllergies(profile.allergies) : [];
  const emergencyNumber = getEmergencyNumber();
  const firstContact = profile ? listEmergencyContacts(profile.id)[0] : null;

  const tryUnlock = async () => {
    const ok = await requireAppUnlock(lockReason);
    setLocked(!ok);
    if (ok) setEmergencyOpen(false);
  };

  useEffect(() => {
    if (Platform.OS === 'web' || !isAppLockEnabled()) return;

    let backgrounded = false;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        backgrounded = true;
        return;
      }
      if (state === 'active' && backgrounded && isAppLockEnabled()) {
        backgrounded = false;
        setLocked(true);
        setEmergencyOpen(false);
        void requireAppUnlock(lockReason).then((ok) => setLocked(!ok));
      }
    });

    return () => subscription.remove();
  }, [lockReason]);

  if (!locked) return children;

  return (
    <View style={styles.root}>
      {children}
      <View style={styles.overlay} testID="app-lock-overlay">
        {emergencyOpen ? (
          <>
            <Text style={styles.title}>{t('settings.appLockEmergency')}</Text>
            <Text style={styles.hint}>{t('settings.appLockEmergencyHint')}</Text>
            {profile ? <Text style={styles.meta}>{profile.name}</Text> : null}
            {allergies.length ? <Text style={styles.meta}>{allergies.join(', ')}</Text> : null}
            <Pressable
              style={styles.button}
              onPress={() => void Linking.openURL(`tel:${emergencyNumber}`)}
              testID="app-lock-call-emergency">
              <Text style={styles.buttonText}>{t('sos.call', { number: emergencyNumber })}</Text>
            </Pressable>
            {firstContact ? (
              <Pressable
                style={styles.secondary}
                onPress={() => void Linking.openURL(`tel:${firstContact.phone.replace(/\s/g, '')}`)}>
                <Text style={styles.secondaryText}>
                  {t('sos.callContact')}: {firstContact.name}
                </Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.secondary} onPress={() => setEmergencyOpen(false)}>
              <Text style={styles.secondaryText}>{t('common.back')}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>{t('settings.appLockTitle')}</Text>
            <Text style={styles.hint}>{t('settings.appLockHint')}</Text>
            <Pressable style={styles.button} onPress={() => void tryUnlock()} testID="app-lock-unlock">
              <Text style={styles.buttonText}>{t('settings.appLockEnable')}</Text>
            </Pressable>
            <Pressable
              style={styles.secondary}
              onPress={() => setEmergencyOpen(true)}
              testID="app-lock-emergency">
              <Text style={styles.secondaryText}>{t('settings.appLockEmergency')}</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 12,
    },
    title: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.h3,
      color: colors.head,
      fontWeight: '600',
    },
    hint: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    meta: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.body,
      color: colors.head,
      textAlign: 'center',
    },
    button: {
      marginTop: 8,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    buttonText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.bodySm,
      color: '#fff',
      fontWeight: '600',
    },
    secondary: {
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    secondaryText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.bodySm,
      color: colors.accent,
      fontWeight: '600',
    },
  });
}
