import { Text, View, StyleSheet, Pressable } from 'react-native';
import { useMemo } from 'react';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

export default function MarketScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const items = useMemo(
    () => [
      {
        title: 'Очиститель воздуха',
        why: 'Может быть полезен при бытовой аллергии и поллинозе',
        icon: 'cloudy',
        tag: 'Воздух',
        color: theme.colors.purple,
      },
      {
        title: 'Гипоаллергенный крем',
        why: 'Подходит для сценариев с кожными проявлениями',
        icon: 'hand-left',
        tag: 'Кожа',
        color: theme.colors.pink,
      },
      {
        title: 'Чехлы для постельного белья',
        why: 'Актуально при реакции на пыль и клещей',
        icon: 'bed',
        tag: 'Дом',
        color: theme.colors.accent,
      },
    ],
    [theme],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Маркет</Text>
        <Text style={styles.subtitle}>Товары для аллергиков</Text>
      </View>

      <ProfileSwitcher />

      <View style={styles.banner}>
        <Ionicons name="star" size={18} color={theme.colors.warning} />
        <Text style={styles.bannerText}>
          Подборка на основе вашего профиля аллергии
        </Text>
      </View>

      {items.map((item) => (
        <Pressable
          key={item.title}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
          <View style={[styles.cardIcon, { backgroundColor: `${item.color}18` }]}>
            <Ionicons name={item.icon as any} size={26} color={item.color} />
          </View>
          <View style={styles.cardBody}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={[styles.tag, { backgroundColor: `${item.color}18` }]}>
                <Text style={[styles.tagText, { color: item.color }]}>{item.tag}</Text>
              </View>
            </View>
            <Text style={styles.cardWhy}>{item.why}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
        </Pressable>
      ))}

      <Text style={styles.disclaimer}>
        Рекомендации основаны на общих характеристиках товара и не заменяют назначения врача.
      </Text>
    </Screen>
  );
}

function createStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
    header: { gap: 3 },
    title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: colors.textSecondary },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.warningLight,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.warningBorder,
    },
    bannerText: { fontSize: 13, color: colors.warningText, fontWeight: '500', flex: 1 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      ...(shadows.md as object),
    },
    pressed: { opacity: 0.85 },
    cardIcon: {
      width: 54,
      height: 54,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: { flex: 1, gap: 6 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    tag: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8 },
    tagText: { fontSize: 11, fontWeight: '700' },
    cardWhy: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  });
}
