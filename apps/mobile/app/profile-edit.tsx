import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ALLERGEN_OPTIONS, type ProfileType } from '@allerguide/core';
import { getProfile, updateProfile } from '@/src/services/profile-service';
import { colors, shadows } from '@/src/constants/theme';
import { Screen } from '@/src/components/Screen';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profileId = Number(id);
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [type, setType] = useState<ProfileType>('self');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profileId) return;
    const profile = getProfile(profileId);
    profile.then((row) => {
      if (!row) return;
      setName(row.name);
      setBirthYear(String(row.birthYear));
      setType(row.type);
      try {
        setSelected(JSON.parse(row.allergies));
      } catch {
        setSelected([]);
      }
    });
  }, [profileId]);

  const toggle = (item: string) =>
    setSelected((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));

  const save = async () => {
    const trimmedName = name.trim();
    const year = Number(birthYear);

    if (!trimmedName) {
      setError('Укажите имя профиля.');
      return;
    }
    if (!birthYear || Number.isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
      setError('Укажите корректный год рождения.');
      return;
    }
    if (selected.length === 0) {
      setError('Выберите хотя бы один аллерген.');
      return;
    }

    setError('');
    await updateProfile(profileId, {
      name: trimmedName,
      birthYear: year,
      type,
      allergies: selected,
    });
    router.back();
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View>
          <Text style={styles.title}>Редактирование</Text>
          <Text style={styles.subtitle}>Обновите данные профиля</Text>
        </View>
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

      <Text style={styles.label}>Аллергены</Text>
      <View style={styles.allergyGrid}>
        {ALLERGEN_OPTIONS.map((item) => (
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

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>Сохранить изменения</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: -4,
  },
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
    ...(shadows.accent as object),
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
});
