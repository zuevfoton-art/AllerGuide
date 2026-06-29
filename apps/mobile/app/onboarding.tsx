import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { useAppStore } from '@/src/store/app-store';
import { setStoredScenario } from '@/src/services/settings-service';
import type { Scenario } from '@allerguide/core';
import { Screen } from '@/src/components/Screen';
import { GlassCard } from '@/src/components/GlassCard';
import { Disclaimer } from '@/src/components/Disclaimer';
import { BrandLogo } from '@/src/components/brand/BrandLogo';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

const SCENARIO_KEYS = [
  { key: 'self', labelKey: 'onboarding.self', descKey: 'onboarding.selfDesc', icon: 'person' },
  { key: 'child', labelKey: 'onboarding.child', descKey: 'onboarding.childDesc', icon: 'happy' },
  { key: 'both', labelKey: 'onboarding.both', descKey: 'onboarding.bothDesc', icon: 'people' },
] as const;

export default function OnboardingScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const setScenario = useAppStore((s) => s.setScenario);

  return (
    <Screen>
      <View style={styles.hero}>
        <BrandLogo size={64} showWordmark />
        <Text style={styles.tagline}>{t('onboarding.tagline')}</Text>
      </View>

      <Text style={ui.sectionLabel}>{t('onboarding.sectionLabel')}</Text>

      {SCENARIO_KEYS.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => {
            setScenario(item.key as Scenario);
            setStoredScenario(item.key as Scenario);
            router.push('/onboarding-storage');
          }}>
          <GlassCard style={styles.card}>
            <View style={styles.cardIcon}>
              <Ionicons name={item.icon as 'person'} size={20} color={theme.colors.accent} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{t(item.labelKey)}</Text>
              <Text style={styles.cardDesc}>{t(item.descKey)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </GlassCard>
        </Pressable>
      ))}

      <Disclaimer>{t('onboarding.disclaimer')}</Disclaimer>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    hero: { alignItems: 'center', paddingVertical: 24, gap: 12 },
    tagline: {
      fontFamily: fonts.sans,
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 0,
    },
    cardIcon: {
      width: 40,
      height: 40,
      borderRadius: 6,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardText: { flex: 1, gap: 3 },
    cardTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    cardDesc: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
}
