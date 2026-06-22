import { View, Text, Platform, StyleSheet } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';

/**
 * AllerGuide brand logo mark.
 * On web: renders an inline SVG icon.
 * On native: renders a styled View fallback using the same proportions.
 */
export function AppLogoMark({ size = 64 }: { size?: number }) {
  const theme = useTheme();

  if (Platform.OS === 'web') {
    return (
      <View style={{ width: size, height: size }}>
        {/* @ts-ignore — SVG JSX is valid on web via react-native-web */}
        <svg
          viewBox="0 0 64 64"
          width={size}
          height={size}
          xmlns="http://www.w3.org/2000/svg">
          {/* Rounded square background */}
          {/* @ts-ignore */}
          <rect width="64" height="64" rx="16" fill={theme.colors.head} />

          {/* Shield outline — soft white */}
          {/* @ts-ignore */}
          <path
            d="M32 10 L50 18 L50 34 Q50 50 32 56 Q14 50 14 34 L14 18 Z"
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1.5"
          />

          {/* Teardrop / allergen drop — accent fill */}
          {/* @ts-ignore */}
          <path
            d="M32 16 C32 16 20 27 20 35.5 C20 42.4 25.4 48 32 48 C38.6 48 44 42.4 44 35.5 C44 27 32 16 32 16 Z"
            fill={theme.colors.accent}
          />

          {/* Medical cross inside the drop — white */}
          {/* @ts-ignore */}
          <rect x="29.5" y="28" width="5" height="14" rx="2.5" fill="white" />
          {/* @ts-ignore */}
          <rect x="24" y="33.5" width="16" height="5" rx="2.5" fill="white" />
        </svg>
      </View>
    );
  }

  /* Native fallback — rendered with Views */
  return (
    <View
      style={[
        styles.nativeMark,
        {
          width: size,
          height: size,
          borderRadius: size * 0.25,
          backgroundColor: theme.colors.head,
        },
      ]}>
      <View
        style={[
          styles.nativeDrop,
          {
            backgroundColor: theme.colors.accent,
            width: size * 0.38,
            height: size * 0.5,
            borderRadius: (size * 0.38) / 2,
            borderBottomLeftRadius: (size * 0.38) / 2,
            borderBottomRightRadius: (size * 0.38) / 2,
            transform: [{ rotate: '180deg' }],
          },
        ]}>
        <View
          style={[styles.nativeCrossV, { backgroundColor: 'white', borderRadius: 2 }]}
        />
        <View
          style={[styles.nativeCrossH, { backgroundColor: 'white', borderRadius: 2 }]}
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
  const markSize = size * 1.4;

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
              color: theme.colors.head,
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
              fontSize: size * 0.38,
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

/**
 * Auth screen hero variant — vertical stack, mark centred above title.
 */
export function AppLogoHero() {
  const theme = useTheme();

  return (
    <View style={styles.heroWrap}>
      <AppLogoMark size={72} />
      <Text
        style={[
          styles.heroTitle,
          {
            color: theme.colors.head,
            fontFamily: theme.fonts.serifBold,
          },
        ]}>
        <Text>Aller</Text>
        <Text style={{ color: theme.colors.accent }}>Guide</Text>
      </Text>
      <Text
        style={[
          styles.heroTagline,
          {
            color: theme.colors.textSecondary,
            fontFamily: theme.fonts.sans,
          },
        ]}>
        ALLERGY MANAGEMENT
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  nativeMark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeDrop: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  nativeCrossV: {
    position: 'absolute',
    width: 4,
    height: 14,
  },
  nativeCrossH: {
    position: 'absolute',
    width: 14,
    height: 4,
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
  heroWrap: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  heroTagline: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
});
