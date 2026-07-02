import { Image, StyleSheet, View } from 'react-native';

export type OnboardingSlideKey = 'profile' | 'scanner' | 'care';

const SLIDE_IMAGES: Record<OnboardingSlideKey, number> = {
  profile: require('../../../assets/onboarding/profile.png'),
  scanner: require('../../../assets/onboarding/scanner.png'),
  care: require('../../../assets/onboarding/care.png'),
};

type OnboardingSlideImageProps = {
  slide: OnboardingSlideKey;
  width?: number;
  height?: number;
};

/** Raster onboarding art (reference illustrations) */
export function OnboardingSlideImage({ slide, width = 280, height = 220 }: OnboardingSlideImageProps) {
  return (
    <View style={[styles.frame, { width, height }]}>
      <Image
        source={SLIDE_IMAGES[slide]}
        style={styles.image}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
