import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { useAppStore } from '@/src/store/app-store';
import { setStoredScenario } from '@/src/services/settings-service';
import type { Scenario } from '@allerguide/core';
import { Screen } from '@/src/components/Screen';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

const scenarios = [
  { key: 'self', label: 'Только для себя', icon: 'person', desc: 'Личный дневник и сканер аллергенов' },
  { key: 'child', label: 'Только для ребёнка', icon: 'happy', desc: 'Профиль и контроль для вашего ребёнка' },
  { key: 'both', label: 'Для себя и ребёнка', icon: 'people', desc: 'Несколько профилей в одном приложении' },
] as const;

export default function OnboardingScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const setScenario = useAppStore((s) => s.setScenario);

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.logoWrap}>
          <Ionicons name="leaf" size={36} color={theme.colors.onAccent} />
        </View>
        <Text style={styles.brand}>AllerGuide</Text>
        <Text style={styles.tagline}>Персональный помощник в контроле аллергии</Text>
      </View>

      <Text style={styles.sectionLabel}>Для кого ведём записи?</Text>

      {scenarios.map((item) => (
        <Pressable
          key={item.key}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => {
            setScenario(item.key as Scenario);
            setStoredScenario(item.key as Scenario);
            router.push('/profile-setup');
          }}>
          <View style={styles.cardIcon}>
            <Ionicons name={item.icon as 'person'} size={22} color={theme.colors.accent} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{item.label}</Text>
            <Text style={styles.cardDesc}>{item.desc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </Pressable>
      ))}

      <Text style={styles.disclaimer}>
        Информация в приложении носит рекомендательный характер и не заменяет консультацию врача.
      </Text>
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
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
      ...(shadows.accentLg as object),
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
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      gap: 14,
      ...(shadows.sm as object),
    },
    cardPressed: { opacity: 0.85 },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardText: { flex: 1, gap: 3 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    cardDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18, marginTop: 4 },
  });
}
