import { Text, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/src/constants/theme';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { Ionicons } from '@expo/vector-icons';

const actions = [
  { label: 'Дневник', desc: 'Записать самочувствие', icon: 'journal', route: '/(tabs)/diary', color: colors.accent },
  { label: 'Сканер', desc: 'Проверить состав', icon: 'scan', route: '/(tabs)/scanner', color: '#5856D6' },
  { label: 'Маркет', desc: 'Товары без аллергенов', icon: 'bag', route: '/(tabs)/market', color: '#34C759' },
  { label: 'Карта', desc: 'Безопасные заведения', icon: 'map', route: '/(tabs)/map', color: '#FF9500' },
] as const;

export default function HomeScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Добро пожаловать 👋</Text>
          <Text style={styles.title}>AllerGuide</Text>
        </View>
        <View style={styles.sosBtn}>
          <Pressable onPress={() => router.push('/(tabs)/sos')} style={styles.sosPressable}>
            <Ionicons name="medkit" size={20} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      <ProfileSwitcher />

      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <Ionicons name="shield-checkmark" size={28} color={colors.accent} />
        </View>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>Контроль аллергии</Text>
          <Text style={styles.bannerDesc}>Ведите дневник и сканируйте продукты</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Быстрые действия</Text>

      <View style={styles.grid}>
        {actions.map((item) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
            onPress={() => router.push(item.route as any)}>
            <View style={[styles.actionIcon, { backgroundColor: `${item.color}18` }]}>
              <Ionicons name={item.icon as any} size={24} color={item.color} />
            </View>
            <Text style={styles.actionLabel}>{item.label}</Text>
            <Text style={styles.actionDesc}>{item.desc}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.disclaimer}>
        Информация в приложении носит рекомендательный характер.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  greeting: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  sosBtn: { marginTop: 4 },
  sosPressable: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentLight,
    borderRadius: 18,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.accentMid,
  },
  bannerIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: { flex: 1, gap: 3 },
  bannerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  bannerDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: -4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  pressed: { opacity: 0.82 },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  actionDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 16 },
  disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
