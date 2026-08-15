import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BrandLogo } from '@/src/components/brand/BrandLogo';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

type ScreenBrandHeaderProps = {
  left?: ReactNode;
  right?: ReactNode;
};

/** Centered mark + slogan lockup used on user-facing screens. */
export function ScreenBrandHeader({ left, right }: ScreenBrandHeaderProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <View style={styles.wrap} testID="screen-brand-header">
      <View style={styles.side}>{left}</View>
      <View style={styles.center}>
        <BrandLogo size={36} />
        <Text style={styles.slogan}>{t('brand.slogan')}</Text>
      </View>
      <View style={[styles.side, styles.sideRight]}>{right}</View>
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
    side: {
      minWidth: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sideRight: {
      justifyContent: 'flex-end',
    },
    center: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    slogan: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.head,
      textAlign: 'center',
      letterSpacing: 0.2,
    },
  });
}
