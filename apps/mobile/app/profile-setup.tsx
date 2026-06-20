import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { createProfile } from '@/src/services/profile-service';
import { useAppStore } from '@/src/store/app-store';
import { colors } from '@/src/constants/theme';
import { Screen } from '@/src/components/Screen';
import { Ionicons } from '@expo/vector-icons';

const allergyOptions = [
  'Пищевая аллергия', 'Поллиноз', 'Бронхиальная астма',
  'Аллергический ринит', 'Атопический дерматит', 'Бытовая аллергия',
  'Аллергия на животных', 'Лекарственная аллергия',
];

export default function ProfileSetupScreen() {
  const scenario = useAppStore((s) => s.scenario);
  const setActiveProfileId = useAppStore((s) => s.setActiveProfileId);
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [type, setType] = useState<'self' | 'child'>(scenario === 'child' ? 'child' : 'self');
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (item: string) =>
    setSelected((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]);

  const save = async () => {
    const id = await createProfile({ name, birthYear: Number(birthYear || 0), type, allergies: selected });
    if (id) setActiveProfileId(id);
    router.replace('/(tabs)/home');
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Создание профиля</Text>
        <Text style={styles.subtitle}>Заполните информацию для персонализации</Text>
      </View>

      <Text style={styles.label}>Имя</Text>
      <TextInput
        placeholder="Введите имя"
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <Text style={styles.label}>Год рождения</Text>
      <TextInput
        placeholder="Например, 1990"
        placeholderTextColor={colors.textMuted}
        value={birthYear}
        onChangeText={setBirthYear}
        keyboardType="numeric"
        style={styles.input}
      />

      <Text style={styles.label}>Профиль</Text>
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, type === 'self' && styles.toggleActive]}
          onPress={() => setType('self')}>
          <Ionicons name="person" size={16} color={type === 'self' ? colors.accent : colors.textSecondary} />
          <Text style={[styles.toggleText, type === 'self' && styles.toggleTextActive]}>Я</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, type === 'child' && styles.toggleActive]}
          onPress={() => setType('child')}>
          <Ionicons name="happy" size={16} color={type === 'child' ? colors.accent : colors.textSecondary} />
          <Text style={[styles.toggleText, type === 'child' && styles.toggleTextActive]}>Ребёнок</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Типы аллергии</Text>
      <View style={styles.allergyGrid}>
        {allergyOptions.map((item) => (
          <Pressable
            key={item}
            style={[styles.allergyChip, selected.includes(item) && styles.allergyChipActive]}
            onPress={() => toggle(item)}>
            {selected.includes(item) && (
              <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
            )}
            <Text style={[styles.allergyText, selected.includes(item) && styles.allergyTextActive]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>Сохранить профиль</Text>
      </Pressable>

      <Text style={styles.disclaimer}>
        Профиль используется для персонализации сканера, дневника, отчётов и рекомендаций.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: -4 },
  input: {
    backgroundColor: colors.card,
    padding: 15,
    borderRadius: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  toggleActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  toggleText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  toggleTextActive: { color: colors.accent },
  allergyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allergyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  allergyChipActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  allergyText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  allergyTextActive: { color: colors.accent, fontWeight: '600' },
  button: {
    backgroundColor: colors.accent,
    padding: 17,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
