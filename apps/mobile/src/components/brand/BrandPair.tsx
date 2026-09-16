import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { radii, space } from '@/src/constants/layout';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

type BrandPairProps = {
  size?: number;
  testID?: string;
};

/**
 * 15% brand mix — two non-interactive tiles (recognition green + composition petrol).
 */
export function BrandPair({ size = 28, testID }: BrandPairProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, size), [theme, size]);

  return (
    <View
      style={styles.row}
      testID={testID ?? 'brand-pair'}
      accessible={false}
      importantForAccessibility="no-hide-descendants">
      <View style={[styles.tile, styles.recognition]} />
      <View style={[styles.tile, styles.composition]} />
    </View>
  );
}

function createStyles({ colors }: AppTheme, size: number) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: space[1],
    },
    tile: {
      width: size,
      height: size,
      borderRadius: radii.md,
    },
    recognition: { backgroundColor: colors.accent },
    composition: { backgroundColor: colors.info },
  });
}
