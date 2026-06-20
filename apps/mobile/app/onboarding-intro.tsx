import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { markIntroComplete } from '@/src/services/settings-service';
import { Screen } from '@/src/components/Screen';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

const SLIDES = [
  {
    key: 'diary',
    title: 'Персональный дневник',
    desc: 'Симптомы, питание, лекарства, пикфлоуметрия, АСИТ и отчёты для врача.',
    icon: 'journal',
    colorKey: 'accent' as const,
  },
  {
    key: 'scanner',
    title: 'Умный сканер',
    desc: 'Продукты, меню, лекарства и косметика — проверка по вашему профилю.',
    icon: 'scan',
    colorKey: 'purple' as const,
  },
  {
    key: 'market',
    title: 'Маркетплейс',
    desc: 'Персональные подборки товаров для аллергиков.',
    icon: 'bag',
    colorKey: 'success' as const,
  },
  {
    key: 'map',
    title: 'Карта мест',
    desc: 'Рестораны, карта пыления и клиники АДАИР.',
    icon: 'map',
    colorKey: 'warning' as const,
  },
  {
    key: 'expert',
    title: 'Эксперт: проф. Смолкин Ю.С.',
    desc: 'Материалы и рекомендации АДАИР в доступном формате.',
    icon: 'school',
    colorKey: 'pink' as const,
  },
];

export default function OnboardingIntroScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [index, setIndex] = useState(0);

  const finish = () => {
    markIntroComplete();
    router.replace('/onboarding');
  };

  const next = () => {
    if (index >= SLIDES.length - 1) {
      finish();
      return;
    }
    setIndex((i) => i + 1);
  };

  const slide = SLIDES[index];
  const color = theme.colors[slide.colorKey];

  return (
    <Screen>
      <View style={styles.progressRow}>
        {SLIDES.map((s, i) => (
          <View key={s.key} style={[styles.dot, i <= index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.slide}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
          <Ionicons name={slide.icon as 'journal'} size={36} color={color} />
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.desc}>{slide.desc}</Text>
      </View>

      <Pressable style={styles.primaryBtn} onPress={next}>
        <Text style={styles.primaryText}>{index >= SLIDES.length - 1 ? 'Начать настройку' : 'Далее'}</Text>
      </Pressable>

      <Pressable onPress={finish}>
        <Text style={styles.skip}>Пропустить</Text>
      </Pressable>

      <Text style={styles.disclaimer}>
        Информация в приложении носит рекомендательный характер и не заменяет консультацию врача.
      </Text>
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
