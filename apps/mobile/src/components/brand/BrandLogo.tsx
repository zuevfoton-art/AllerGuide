import { useMemo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { BrandMark } from '@/src/components/brand/BrandMark';
import { useTranslation } from '@/src/store/locale-store';

type BrandLogoProps = {
  size?: number;
  /** @deprecated Wordmark text is no longer shown on screens; mark only. */
  showWordmark?: boolean;
  /** Co-brand lockup: "an Aclearo app" under the mark */
  showEndorser?: boolean;
  style?: ViewStyle;
};

export function BrandLogo({
  size = 64,
  showEndorser = false,
  style,
}: BrandLogoProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme, size), [theme, size]);

  if (!showEndorser) {
    return (
      <View style={[styles.markWrap, style]}>
        <BrandMark size={size} accent={theme.colors.accent} color={theme.colors.onAccent} />
      </View>
    );
  }

  return (
    <View style={[styles.column, style]}>
      <BrandMark size={size} accent={theme.colors.accent} color={theme.colors.onAccent} />
      <Text style={styles.endorser}>{t('brand.endorser')}</Text>
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme, size: number) {
  const endorserSize = Math.round(size * 0.2);
  return StyleSheet.create({
    markWrap: { alignSelf: 'center' },
    column: { alignItems: 'center', gap: Math.round(size * 0.12) },
    endorser: {
      fontFamily: fonts.sans,
      fontSize: endorserSize,
      fontWeight: '400',
      color: colors.textMuted,
      letterSpacing: 0.2,
    },
  });
}
