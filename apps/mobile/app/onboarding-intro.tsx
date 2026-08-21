import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  SafeAreaView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { markIntroComplete } from '@/src/services/settings-service';
import { Disclaimer } from '@/src/components/Disclaimer';
import { OnboardingWaveBackground } from '@/src/components/onboarding/OnboardingWaveBackground';
import { OnboardingSlideImage, type OnboardingSlideKey } from '@/src/components/onboarding/OnboardingSlideImage';
import { OnboardingSlideChrome } from '@/src/components/onboarding/OnboardingSlideChrome';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { useResponsiveLayout } from '@/src/hooks/use-responsive-layout';

const SLIDE_KEYS: OnboardingSlideKey[] = ['profile', 'scanner', 'care', 'map', 'sos'];
const CARD_PADDING_H = 16;

export default function OnboardingIntroScreen() {
  const theme = useTheme();
  const layout = useResponsiveLayout();
  const styles = useMemo(
    () => createStyles(theme, layout.horizontalPadding, layout.isCompact),
    [theme, layout.horizontalPadding, layout.isCompact],
  );
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<OnboardingSlideKey>>(null);
  const [index, setIndex] = useState(0);
  const [measuredSlideWidth, setMeasuredSlideWidth] = useState(0);

  const cardOuterWidth = Math.min(
    windowWidth - layout.horizontalPadding * 2,
    layout.contentMaxWidth ?? Number.POSITIVE_INFINITY,
  );
  const fallbackSlideWidth = Math.max(0, cardOuterWidth - CARD_PADDING_H * 2);
  const slideWidth = measuredSlideWidth || fallbackSlideWidth;
  const illustrationWidth = Math.min(slideWidth - 16, layout.isCompact ? 248 : 300);

  const onCarouselLayout = useCallback((event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    if (width > 0) {
      setMeasuredSlideWidth(width);
    }
  }, []);

  const finish = () => {
    markIntroComplete();
    router.replace('/onboarding');
  };

  const goToIndex = (nextIndex: number) => {
    setIndex(nextIndex);
    listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
  };

  const next = () => {
    if (index >= SLIDE_KEYS.length - 1) {
      finish();
      return;
    }
    goToIndex(index + 1);
  };

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (slideWidth <= 0) return;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    if (nextIndex >= 0 && nextIndex < SLIDE_KEYS.length) {
      setIndex(nextIndex);
    }
  };

  const renderSlide = ({ item }: { item: OnboardingSlideKey }) => (
    <View style={[styles.slide, slideWidth > 0 && { width: slideWidth }]}>
      <View style={styles.illustrationFrame}>
        <OnboardingSlideImage
          slide={item}
          width={illustrationWidth}
          height={illustrationWidth * 0.85}
        />
      </View>
      <Text style={styles.title}>{t(`onboardingIntro.slides.${item}.title`)}</Text>
      <Text style={styles.desc}>{t(`onboardingIntro.slides.${item}.desc`)}</Text>
    </View>
  );

  const isLast = index >= SLIDE_KEYS.length - 1;

  return (
    <View style={styles.root}>
      <OnboardingWaveBackground
        accent={theme.colors.accent}
        accentLight={theme.colors.accentLight}
      />
      <SafeAreaView style={styles.safe}>
        <View style={[styles.card, { maxWidth: layout.contentMaxWidth }]}>
          <View style={styles.carouselViewport} onLayout={onCarouselLayout}>
            {slideWidth > 0 ? (
              <FlatList
                ref={listRef}
                data={SLIDE_KEYS}
                keyExtractor={(item) => item}
                renderItem={renderSlide}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onMomentumScrollEnd}
                getItemLayout={(_, i) => ({ length: slideWidth, offset: slideWidth * i, index: i })}
                style={styles.carousel}
                contentContainerStyle={styles.carouselContent}
              />
            ) : null}
          </View>

          <View style={styles.bottom}>
            <OnboardingSlideChrome
              theme={theme}
              slideCount={SLIDE_KEYS.length}
              index={index}
              isLast={isLast}
              nextLabel={t('onboardingIntro.next')}
              startLabel={t('onboardingIntro.startSetup')}
              skipLabel={t('onboardingIntro.skip')}
              onNext={next}
              onSkip={finish}
            />
            <Disclaimer compact>{t('onboardingIntro.disclaimer')}</Disclaimer>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme, horizontalPadding: number, isCompact: boolean) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    safe: {
      flex: 1,
      paddingHorizontal: horizontalPadding,
      paddingVertical: 12,
    },
    card: {
      flex: 1,
      width: '100%',
      alignSelf: 'center',
      backgroundColor: colors.card,
      borderRadius: 28,
      overflow: 'hidden',
      paddingTop: 20,
      paddingBottom: 20,
      paddingHorizontal: 16,
    },
    carouselViewport: {
      flex: 1,
      width: '100%',
      overflow: 'hidden',
    },
    carousel: {
      flex: 1,
    },
    carouselContent: {
      alignItems: 'stretch',
    },
    slide: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      paddingHorizontal: 4,
    },
    illustrationFrame: {
      width: '100%',
      minHeight: 200,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    title: {
      fontFamily: fonts.serifBold,
      fontSize: isCompact ? 22 : 26,
      fontWeight: '700',
      color: colors.head,
      textAlign: 'center',
      letterSpacing: -0.3,
      lineHeight: isCompact ? 28 : 32,
      paddingHorizontal: 4,
      width: '100%',
      flexShrink: 1,
    },
    desc: {
      fontFamily: fonts.sans,
      fontSize: isCompact ? 14 : 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: isCompact ? 20 : 22,
      paddingHorizontal: 4,
      width: '100%',
      flexShrink: 1,
    },
    bottom: {
      gap: 10,
      paddingTop: 4,
    },
  });
}
