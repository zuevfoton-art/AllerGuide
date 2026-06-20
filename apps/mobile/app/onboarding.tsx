import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { useAppStore } from '@/src/store/app-store';
import { setStoredScenario } from '@/src/services/settings-service';
import type { Scenario } from '@allerguide/core';
import { Screen } from '@/src/components/Screen';
import { GlassCard } from '@/src/components/GlassCard';
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
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const setScenario = useAppStore((s) => s.setScenario);

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.logoWrap}>
          <Ionicons name="leaf" size={36} color={theme.colors.onAccent} />
        </View>
        <Text style={styles.brand}>AllerGuide</Text>
        <Text style={styles.tagline}>{t('onboarding.tagline')}</Text>
      </View>

      <Text style={styles.sectionLabel}>{t('onboarding.sectionLabel')}</Text>

      {SCENARIO_KEYS.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => {
            setScenario(item.key as Scenario);
            setStoredScenario(item.key as Scenario);
            router.push('/profile-setup');
          }}>
          <GlassCard style={styles.card}>
            <View style={styles.cardIcon}>
              <Ionicons name={item.icon as 'person'} size={22} color={theme.colors.teal} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{t(item.labelKey)}</Text>
              <Text style={styles.cardDesc}>{t(item.descKey)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </GlassCard>
        </Pressable>
      ))}

      <Text style={styles.disclaimer}>{t('onboarding.disclaimer')}</Text>
    </Screen>
  );
}

function createStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
    hero: { alignItems: 'center', paddingVertical: 24, gap: 10 },
    logoWrap: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: colors.teal,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
      ...(shadows.glass as object),
    },
    brand: { fontSize: 32, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    tagline: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: -4,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 0,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.tealLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardText: { flex: 1, gap: 3 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    cardDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18, marginTop: 4 },
  });
}
