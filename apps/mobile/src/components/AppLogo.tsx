import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';

/**
 * AllerGuide brand logo mark — pure React Native (no SVG deps).
 * Renders a navy rounded square with an accent-blue allergen drop
 * and a white medical cross inside.
 */
export function AppLogoMark({ size = 64 }: { size?: number }) {
  const theme = useTheme();

  const radius = Math.round(size * 0.22);
  const dropW = Math.round(size * 0.42);
  const dropH = Math.round(size * 0.54);
  const dropRadius = Math.round(dropW / 2);
  const crossThick = Math.max(3, Math.round(size * 0.073));
  const crossShort = Math.round(size * 0.26);
  const crossLong = Math.round(size * 0.36);
  const crossR = Math.round(crossThick / 2);

  return (
    <View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: theme.colors.head,
        },
      ]}>
      {/* Allergen drop shape */}
      <View
        style={{
          width: dropW,
          height: dropH,
          borderRadius: dropRadius,
          backgroundColor: theme.colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {/* Vertical bar of cross */}
        <View
          style={{
            position: 'absolute',
            width: crossThick,
            height: crossLong,
            borderRadius: crossR,
            backgroundColor: 'white',
          }}
        />
        {/* Horizontal bar of cross */}
        <View
          style={{
            position: 'absolute',
            width: crossShort,
            height: crossThick,
            borderRadius: crossR,
            backgroundColor: 'white',
          }}
        />
      </View>
    </View>
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
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
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
