import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { markIntroComplete } from '@/src/services/settings-service';
import { Screen } from '@/src/components/Screen';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

const SLIDE_KEYS = ['diary', 'scanner', 'market', 'map', 'expert'] as const;
const SLIDE_ICONS = {
  diary: 'journal',
  scanner: 'scan',
  market: 'bag',
  map: 'map',
  expert: 'school',
} as const;
const SLIDE_COLORS = {
  diary: 'accent',
  scanner: 'purple',
  market: 'success',
  map: 'warning',
  expert: 'pink',
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
      <View style={styles.progressRow}>
        {SLIDE_KEYS.map((s, i) => (
          <View key={s} style={[styles.dot, i <= index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.slide}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
          <Ionicons name={SLIDE_ICONS[slideKey] as 'journal'} size={36} color={color} />
        </View>
        <Text style={styles.title}>{t(`onboardingIntro.slides.${slideKey}.title`)}</Text>
        <Text style={styles.desc}>{t(`onboardingIntro.slides.${slideKey}.desc`)}</Text>
      </View>

      <Pressable style={styles.primaryBtn} onPress={next}>
        <Text style={styles.primaryText}>
          {index >= SLIDE_KEYS.length - 1 ? t('onboardingIntro.startSetup') : t('onboardingIntro.next')}
        </Text>
      </Pressable>

      <Pressable onPress={finish}>
        <Text style={styles.skip}>{t('onboardingIntro.skip')}</Text>
      </Pressable>

      <Text style={styles.disclaimer}>{t('onboardingIntro.disclaimer')}</Text>
    </Screen>
  );
}

function createStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
    progressRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 24 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
    dotActive: { backgroundColor: colors.accent, width: 20 },
    slide: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 12 },
    iconWrap: {
      width: 80,
      height: 80,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    title: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' },
    desc: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
    primaryBtn: {
      backgroundColor: colors.accent,
      padding: 16,
      borderRadius: 16,
      alignItems: 'center',
      ...(shadows.accent as object),
    },
    primaryText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
    skip: { textAlign: 'center', color: colors.textMuted, fontWeight: '600', marginTop: 12 },
    disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18, marginTop: 16 },
  });
}
