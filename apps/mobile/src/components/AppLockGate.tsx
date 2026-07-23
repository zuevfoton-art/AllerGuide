import { useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { isAppLockEnabled, requireAppUnlock } from '@/src/services/app-lock-service';
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
  const [locked, setLocked] = useState(() => Platform.OS !== 'web' && isAppLockEnabled());
  const [checkedColdStart, setCheckedColdStart] = useState(false);
  const lockReason = t('settings.appLockUnlockReason');

  const tryUnlock = async () => {
    const ok = await requireAppUnlock(lockReason);
    setLocked(!ok);
  };

  useEffect(() => {
    if (Platform.OS === 'web' || checkedColdStart) return;
    setCheckedColdStart(true);
    if (!isAppLockEnabled()) {
      setLocked(false);
      return;
    }
    setLocked(true);
    void requireAppUnlock(lockReason).then((ok) => setLocked(!ok));
  }, [checkedColdStart, lockReason]);

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
        <Text style={styles.title}>{t('settings.appLockTitle')}</Text>
        <Text style={styles.hint}>{t('settings.appLockHint')}</Text>
        <Pressable style={styles.button} onPress={() => void tryUnlock()} testID="app-lock-unlock">
          <Text style={styles.buttonText}>{t('settings.appLockUnlock')}</Text>
        </Pressable>
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
  });
}
