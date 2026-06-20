import { Text, View, StyleSheet, Pressable } from 'react-native';
import { colors, shadows } from '@/src/constants/theme';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { Ionicons } from '@expo/vector-icons';

const places = [
  {
    title: 'Green Bowl Cafe',
    level: 'Высокий',
    levelColor: colors.success,
    note: 'Есть аллергенная разметка и фильтры по меню',
    icon: 'leaf',
  },
  {
    title: 'Simple Family Kitchen',
    level: 'Средний',
    levelColor: colors.warning,
    note: 'Нужно уточнять состав блюд у персонала',
    icon: 'restaurant',
  },
];

const levelBg: Record<string, string> = {
  [colors.success]: colors.successLight,
  [colors.warning]: '#FFF3E0',
};

export default function MapScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Карта и места</Text>
        <Text style={styles.subtitle}>Безопасные заведения рядом</Text>
      </View>

      <ProfileSwitcher />

      <View style={styles.mapPlaceholder}>
        <Ionicons name="map" size={40} color={colors.textMuted} />
        <Text style={styles.mapText}>Карта доступна в нативной версии</Text>
      </View>

      <Text style={styles.sectionLabel}>Рекомендованные места</Text>

      {places.map((p) => (
        <Pressable
          key={p.title}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
          <View style={[styles.cardIcon, { backgroundColor: levelBg[p.levelColor] ?? colors.accentLight }]}>
            <Ionicons name={p.icon as any} size={24} color={p.levelColor} />
          </View>
          <View style={styles.cardBody}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{p.title}</Text>
              <View style={[styles.badge, { backgroundColor: levelBg[p.levelColor] ?? colors.accentLight }]}>
                <Text style={[styles.badgeText, { color: p.levelColor }]}>{p.level}</Text>
              </View>
            </View>
            <Text style={styles.cardNote}>{p.note}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      ))}

      <Text style={styles.disclaimer}>
        Информация о местах носит ориентировочный характер, состав нужно уточнять в заведении.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 3 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  mapPlaceholder: {
    height: 160,
    backgroundColor: colors.card,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  mapText: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: -4 },
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
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  badge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardNote: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
