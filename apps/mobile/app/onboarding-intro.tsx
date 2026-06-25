import { View, Text, Pressable, StyleSheet, FlatList, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { markIntroComplete } from '@/src/services/settings-service';
import { Screen } from '@/src/components/Screen';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { BrandLogo } from '@/src/components/brand/BrandLogo';
import { BrandSlideIcon } from '@/src/components/brand/BrandTabIcon';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

const SLIDE_KEYS = ['diary', 'scanner', 'market', 'map', 'expert'] as const;
const SLIDE_COLORS = {
  diary: 'accent',
  scanner: 'info',
  market: 'success',
  map: 'head',
  expert: 'accent',
} as const;

type SlideKey = (typeof SLIDE_KEYS)[number];

export default function OnboardingIntroScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<SlideKey>>(null);
  const [index, setIndex] = useState(0);
  const slideWidth = Math.min(windowWidth, 720);

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
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    if (nextIndex >= 0 && nextIndex < SLIDE_KEYS.length) {
      setIndex(nextIndex);
    }
  };

  const renderSlide = ({ item }: { item: SlideKey }) => {
    const colorKey = SLIDE_COLORS[item];
    const color = theme.colors[colorKey];

    return (
      <View style={[styles.slide, { width: slideWidth }]}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
          <BrandSlideIcon slide={item} size={32} color={color} />
        </View>
        <Text style={styles.title}>{t(`onboardingIntro.slides.${item}.title`)}</Text>
        <Text style={styles.desc}>{t(`onboardingIntro.slides.${item}.desc`)}</Text>
      </View>
    );
  };

  return (
    <Screen scroll={false}>
      <View style={styles.body}>
        <BrandLogo size={40} showWordmark style={styles.brand} />

        <View style={styles.progressRow}>
          {SLIDE_KEYS.map((s, i) => (
            <View key={s} style={[styles.dot, i <= index && styles.dotActive]} />
          ))}
        </View>

        <FlatList
          ref={listRef}
          data={[...SLIDE_KEYS]}
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

        <View style={styles.footer}>
          <Button
            label={index >= SLIDE_KEYS.length - 1 ? t('onboardingIntro.startSetup') : t('onboardingIntro.next')}
            variant="primary"
            block
            onPress={next}
          />

          <Pressable onPress={finish}>
            <Text style={styles.skip}>{t('onboardingIntro.skip')}</Text>
          </Pressable>

          <Disclaimer showMdrFootnote>{t('onboardingIntro.disclaimer')}</Disclaimer>
        </View>
      </View>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    body: { flex: 1, gap: 8 },
    brand: { alignSelf: 'center', marginBottom: 8 },
    progressRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
    dotActive: { backgroundColor: colors.accent, width: 20 },
    carousel: { flex: 1 },
    carouselContent: { alignItems: 'center' },
    slide: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingHorizontal: 12,
    },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    title: {
      fontFamily: fonts.serifBold,
      fontSize: 24,
      fontWeight: '700',
      color: colors.head,
      textAlign: 'center',
      letterSpacing: -0.2,
    },
    desc: {
      fontFamily: fonts.sans,
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    footer: { gap: 0, paddingTop: 8 },
    skip: {
      fontFamily: fonts.sansSemiBold,
      textAlign: 'center',
      color: colors.textMuted,
      fontWeight: '600',
      marginTop: 12,
      fontSize: 14,
    },
  });
}
