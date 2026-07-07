import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useMemo } from 'react';
import { BrandLogo } from '@/src/components/brand/BrandLogo';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

type AppSplashProps = {
  label?: string;
};

export function AppSplash(_props: AppSplashProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <BrandLogo size={72} showWordmark showEndorser />
      <ActivityIndicator color={theme.colors.accent} style={styles.spinner} />
    </View>
  );
}

function createStyles({ colors }: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bg,
      gap: 24,
      padding: 24,
    },
    spinner: { marginTop: 8 },
  });
}
