import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { BrandLogo } from '@/src/components/brand/BrandLogo';
import { HOME_TAB_HREF } from '@/src/components/brand/brand-header-nav';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { isAuthenticated } from '@/src/services/auth-service';
import { useTranslation } from '@/src/store/locale-store';

type ScreenBrandHeaderProps = {
  left?: ReactNode;
  right?: ReactNode;
};

/**
 * Left-aligned brand mark. After login, the lockup opens Today.
 * The slogan lives on the auth hero, onboarding and «About» only — repeating it on
 * every tab cost ~180 pt of chrome before the content (north-star §3.3).
 */
export function ScreenBrandHeader({ left, right }: ScreenBrandHeaderProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const canOpenHome = isAuthenticated();

  const openHome = () => {
    if (!canOpenHome) return;
    router.navigate(HOME_TAB_HREF);
  };

  return (
    <View style={styles.wrap} testID="screen-brand-header">
      <View style={styles.leading}>
        <Pressable
          testID="screen-brand-home"
          onPress={openHome}
          disabled={!canOpenHome}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canOpenHome }}
          accessibilityLabel={t('brand.goHome')}>
          <View style={styles.lockup}>
            <BrandLogo size={32} />
          </View>
        </Pressable>
        {left}
      </View>
      <View style={styles.sideRight}>{right}</View>
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    leading: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    lockup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
    },
    sideRight: {
      flexShrink: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
    },
  });
}
