import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '@/src/store/app-store';
import { colors } from '@/src/constants/theme';
import { Screen } from '@/src/components/Screen';

export default function OnboardingScreen() {
  const setScenario = useAppStore((s) => s.setScenario);
  const scenarios = [
    { key: 'self', label: 'Только для себя' },
    { key: 'child', label: 'Только для ребёнка' },
    { key: 'both', label: 'Для себя и ребёнка' },
  ] as const;

  return (
    <Screen>
      <Text style={styles.brand}>AllerGuide</Text>
      <Text style={styles.title}>Контроль аллергии, дневник, сканер, маркет и карта мест</Text>
      <Text style={styles.subtitle}>Выберите сценарий, для кого вы хотите вести записи</Text>
      {scenarios.map((item) => (
        <Pressable
          key={item.key}
          style={styles.card}
          onPress={() => {
            setScenario(item.key);
            router.push('/profile-setup');
          }}>
          <Text style={styles.cardText}>{item.label}</Text>
        </Pressable>
      ))}
      <Text style={styles.disclaimer}>Информация в приложении носит рекомендательный и справочный характер и не заменяет консультацию врача.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { fontSize: 32, fontWeight: '700', color: colors.forest },
  title: { fontSize: 24, fontWeight: '700', color: colors.forest },
  subtitle: { fontSize: 16, color: colors.green },
  card: { backgroundColor: '#fff', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: colors.foam },
  cardText: { fontSize: 16, fontWeight: '600', color: colors.forest },
  disclaimer: { marginTop: 20, color: '#4b5d51', fontSize: 13, lineHeight: 18 }
});
