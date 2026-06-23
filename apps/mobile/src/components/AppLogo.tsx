import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { BrandMark } from '@/src/components/brand/BrandMark';

/**
 * AllerGuide logo mark — delegates to the canonical BrandMark SVG.
 * Kept as a separate component so existing import sites don't need to change.
 */
export function AppLogoMark({ size = 64 }: { size?: number }) {
  const theme = useTheme();
  return (
    <BrandMark
      size={size}
      variant="filled"
      accent={theme.colors.accent}
      color={theme.colors.onAccent}
    />
  );
}

/**
 * Full AllerGuide wordmark — icon mark + logotype side by side.
 */
export function AppLogoFull({ size = 32 }: { size?: number }) {
  const theme = useTheme();
  const markSize = Math.round(size * 1.4);

  return (
    <View style={styles.fullWrap}>
      <AppLogoMark size={markSize} />
      <View style={styles.wordmark}>
        <Text
          style={[
            styles.wordmarkText,
            {
              fontSize: size,
              lineHeight: size * 1.15,
              fontFamily: theme.fonts.serifBold,
            },
          ]}>
          <Text style={{ color: theme.colors.head }}>Aller</Text>
          <Text style={{ color: theme.colors.accent }}>Guide</Text>
        </Text>
        <Text
          style={[
            styles.tagline,
            {
              fontSize: Math.round(size * 0.38),
              color: theme.colors.textSecondary,
              fontFamily: theme.fonts.sans,
              letterSpacing: 0.8,
            },
          ]}>
          ALLERGY MANAGEMENT
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  wordmark: {
    gap: 2,
  },
  wordmarkText: {
    fontWeight: '700',
  },
  tagline: {
    fontWeight: '400',
    textTransform: 'uppercase',
  },
});
