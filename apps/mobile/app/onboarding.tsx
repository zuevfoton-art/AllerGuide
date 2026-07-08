import { View, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { useAppStore } from '@/src/store/app-store';
import { setStoredScenario } from '@/src/services/settings-service';
import type { Scenario } from '@allerguide/core';
import { Disclaimer } from '@/src/components/Disclaimer';
import { BrandLogo } from '@/src/components/brand/BrandLogo';
import { OnboardingWaveBackground } from '@/src/components/onboarding/OnboardingWaveBackground';
import { OnboardingSlideImage } from '@/src/components/onboarding/OnboardingSlideImage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { useResponsiveLayout } from '@/src/hooks/use-responsive-layout';

const SCENARIO_KEYS = [
  { key: 'self', labelKey: 'onboarding.self', descKey: 'onboarding.selfDesc', icon: 'person' },
  { key: 'child', labelKey: 'onboarding.child', descKey: 'onboarding.childDesc', icon: 'happy' },
  { key: 'both', labelKey: 'onboarding.both', descKey: 'onboarding.bothDesc', icon: 'people' },
] as const;

const CARD_PADDING_H = 20;

export default function OnboardingScreen() {
  const theme = useTheme();
  const layout = useResponsiveLayout();
  const styles = useMemo(
    () => createStyles(theme, layout.horizontalPadding, layout.isCompact),
    [theme, layout.horizontalPadding, layout.isCompact],
  );
  const { t } = useTranslation();
  const setScenario = useAppStore((s) => s.setScenario);
  const cardInnerWidth = Math.max(
    0,
    Math.min(layout.width - layout.horizontalPadding * 2, layout.contentMaxWidth ?? Number.POSITIVE_INFINITY) -
      CARD_PADDING_H * 2,
  );
  const heroArtWidth = Math.min(cardInnerWidth - 24, layout.isCompact ? 200 : 220);

  return (
    <View style={styles.root}>
      <OnboardingWaveBackground
        calmMid={theme.colors.calmMid}
        calmWash={theme.colors.calmWash}
      />
      <SafeAreaView style={styles.safe}>
        <View style={[styles.card, { maxWidth: layout.contentMaxWidth }]}>
          <View style={styles.hero}>
            <BrandLogo size={44} showWordmark showEndorser />
            <View style={styles.heroArt}>
              <OnboardingSlideImage slide="profile" width={heroArtWidth} height={heroArtWidth * 0.68} />
            </View>
            <Text style={styles.tagline}>{t('onboarding.tagline')}</Text>
          </View>

          <Text style={styles.sectionLabel}>{t('onboarding.sectionLabel')}</Text>

          {SCENARIO_KEYS.map((item) => (
            <Pressable
              key={item.key}
              testID={`onboarding-scenario-${item.key}`}
              onPress={() => {
                setScenario(item.key as Scenario);
                setStoredScenario(item.key as Scenario);
                router.push('/profile-setup');
              }}>
              <View style={styles.scenarioCard}>
                <View style={styles.cardIcon}>
                  <Ionicons name={item.icon as 'person'} size={20} color={theme.colors.accent} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{t(item.labelKey)}</Text>
                  <Text style={styles.cardDesc}>{t(item.descKey)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </View>
            </Pressable>
          ))}

          <Disclaimer>{t('onboarding.disclaimer')}</Disclaimer>
        </View>
      </SafeAreaView>
    </View>
  );
}

function createStyles({ colors, fonts, shadows }: AppTheme, horizontalPadding: number, isCompact: boolean) {
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
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 24,
      gap: 14,
      ...shadows.md,
    },
    hero: {
      alignItems: 'center',
      gap: 8,
      paddingBottom: 4,
    },
    heroArt: {
      marginTop: -4,
      marginBottom: -8,
    },
    tagline: {
      fontFamily: fonts.sans,
      fontSize: isCompact ? 14 : 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: isCompact ? 20 : 22,
      paddingHorizontal: 4,
      width: '100%',
      flexShrink: 1,
    },
    sectionLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    scenarioCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      width: '100%',
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardText: { flex: 1, gap: 3, minWidth: 0, flexShrink: 1 },
    cardTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: isCompact ? 15 : 16,
      fontWeight: '600',
      color: colors.text,
      flexShrink: 1,
    },
    cardDesc: {
      fontFamily: fonts.sans,
      fontSize: isCompact ? 12 : 13,
      color: colors.textSecondary,
      lineHeight: 18,
      flexShrink: 1,
    },
  });
}
