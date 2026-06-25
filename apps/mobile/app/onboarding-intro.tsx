import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
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

export default function OnboardingIntroScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  const finish = () => {
    markIntroComplete();
    router.replace('/onboarding');
  };

  const next = () => {
    if (index >= SLIDE_KEYS.length - 1) {
      finish();
      return;
    }
    setIndex((i) => i + 1);
  };

  const slideKey = SLIDE_KEYS[index];
  const colorKey = SLIDE_COLORS[slideKey];
  const color = theme.colors[colorKey];

  return (
    <Screen>
      <BrandLogo size={40} showWordmark style={styles.brand} />

      <View style={styles.progressRow}>
        {SLIDE_KEYS.map((s, i) => (
          <View key={s} style={[styles.dot, i <= index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.slide}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
          <BrandSlideIcon slide={slideKey} size={32} color={color} />
        </View>
        <Text style={styles.title}>{t(`onboardingIntro.slides.${slideKey}.title`)}</Text>
        <Text style={styles.desc}>{t(`onboardingIntro.slides.${slideKey}.desc`)}</Text>
      </View>

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
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    brand: { alignSelf: 'center', marginBottom: 8 },
    progressRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 24 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
    dotActive: { backgroundColor: colors.accent, width: 20 },
    slide: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 12 },
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
