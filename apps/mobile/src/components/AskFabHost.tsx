import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { usePathname, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AskChatSheet } from '@/src/components/AskChatSheet';
import { shouldShowAskFab } from '@/src/components/ask-fab-visibility';
import { density, radii, space } from '@/src/constants/layout';
import { useTheme } from '@/src/hooks/use-theme';
import { useResponsiveLayout } from '@/src/hooks/use-responsive-layout';
import { useTranslation } from '@/src/store/locale-store';

/**
 * Floating Ask entry — sits above shell chrome on allowed routes (not SOS / auth / onboarding).
 */
export function AskFabHost() {
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const { tabBarHeight } = useResponsiveLayout();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const allowed = shouldShowAskFab(pathname);
  const inTabs = segments[0] === '(tabs)';
  const bottomOffset = inTabs
    ? tabBarHeight + space[3]
    : Math.max(insets.bottom, space[3]) + space[4];
  const showFab = allowed && !open;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          position: 'absolute',
          right: space[4],
          bottom: bottomOffset,
          zIndex: 40,
        },
        fab: {
          width: density.tapMinHeight + 8,
          height: density.tapMinHeight + 8,
          borderRadius: radii.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.accent,
          borderWidth: 2,
          borderColor: colors.card,
        },
      }),
    [bottomOffset, colors.accent, colors.card],
  );

  if (!allowed && !open) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill} testID="ask-fab-host">
      {showFab ? (
        <View style={styles.wrap} pointerEvents="box-none">
          <Pressable
            testID="ask-fab"
            accessibilityRole="button"
            accessibilityLabel={t('ask.fabLabel')}
            onPress={() => setOpen(true)}
            style={[styles.fab, shadows.accentLg]}>
            <Ionicons name="chatbubble-ellipses" size={24} color={colors.onAccent} />
          </Pressable>
        </View>
      ) : null}
      <AskChatSheet visible={open} onClose={() => setOpen(false)} context={['surface:fab']} />
    </View>
  );
}
