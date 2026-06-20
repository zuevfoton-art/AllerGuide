import { Text, StyleSheet, Linking, Pressable, View } from 'react-native';
import { colors, shadows } from '@/src/constants/theme';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/src/store/app-store';

export default function SosScreen() {
  const profile = useAppStore((s) => s.activeProfile);
  const allergies: string[] = profile?.allergies
    ? (() => {
        try {
          return JSON.parse(profile.allergies) as string[];
        } catch {
          return [];
        }
      })()
    : [];

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.sosIconWrap}>
          <Ionicons name="medkit" size={30} color={colors.danger} />
        </View>
        <View>
          <Text style={styles.title}>SOS</Text>
          <Text style={styles.subtitle}>Экстренная информация</Text>
        </View>
      </View>

      <ProfileSwitcher />

      {profile ? (
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="person-circle" size={18} color={colors.textSecondary} />
            <Text style={styles.infoLabel}>Имя:</Text>
            <Text style={styles.infoValue}>{profile.name}</Text>
          </View>
          {profile.birthYear ? (
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={18} color={colors.textSecondary} />
              <Text style={styles.infoLabel}>Год рождения:</Text>
              <Text style={styles.infoValue}>{profile.birthYear}</Text>
            </View>
          ) : null}
          {allergies.length > 0 && (
            <View style={styles.allergySection}>
              <View style={styles.infoRow}>
                <Ionicons name="warning" size={18} color={colors.danger} />
                <Text style={[styles.infoLabel, { color: colors.danger }]}>Аллергии:</Text>
              </View>
              <View style={styles.allergyChips}>
                {allergies.map((a) => (
                  <View key={a} style={styles.allergyChip}>
                    <Text style={styles.allergyText}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="person-add" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>Выберите профиль, чтобы увидеть медицинскую информацию</Text>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [styles.emergencyBtn, pressed && { opacity: 0.9 }]}
        onPress={() => Linking.openURL('tel:103')}>
        <Ionicons name="call" size={22} color="#fff" />
        <Text style={styles.emergencyText}>Позвонить 103</Text>
      </Pressable>

      <View style={styles.tipCard}>
        <Ionicons name="information-circle" size={18} color='#5856D6' />
        <Text style={styles.tipText}>
          Покажите этот экран медработнику в случае анафилактической реакции
        </Text>
      </View>

      <Text style={styles.disclaimer}>
        Информация на экране SOS внесена пользователем и не является медицинским назначением.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sosIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    ...(shadows.md as object),
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  infoValue: { fontSize: 14, color: colors.text, fontWeight: '700', flex: 1 },
  allergySection: { gap: 8 },
  allergyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  allergyChip: {
    backgroundColor: colors.dangerLight,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFB3AE',
  },
  allergyText: { fontSize: 13, color: colors.danger, fontWeight: '600' },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.danger,
    padding: 18,
    borderRadius: 18,
    ...(shadows.danger as object),
  },
  emergencyText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EFEDFF',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: '#C7C4F5',
  },
  tipText: { fontSize: 13, color: '#3A37A8', lineHeight: 18, flex: 1 },
  disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
