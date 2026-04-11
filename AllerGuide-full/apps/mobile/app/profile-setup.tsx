import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { createProfile } from '@/src/services/profile-service';
import { useAppStore } from '@/src/store/app-store';
import { colors } from '@/src/constants/theme';
import { Screen } from '@/src/components/Screen';

const allergyOptions = ['Пищевая аллергия','Поллиноз','Бронхиальная астма','Аллергический ринит','Атопический дерматит','Бытовая аллергия','Аллергия на животных','Лекарственная аллергия'];

export default function ProfileSetupScreen() {
  const scenario = useAppStore((s) => s.scenario);
  const setActiveProfileId = useAppStore((s) => s.setActiveProfileId);
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [type, setType] = useState<'self' | 'child'>(scenario === 'child' ? 'child' : 'self');
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (item: string) => setSelected((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]);

  const save = async () => {
    const id = await createProfile({ name, birthYear: Number(birthYear || 0), type, allergies: selected });
    if (id) setActiveProfileId(id);
    router.replace('/(tabs)/home');
  };

  return (
    <Screen>
      <Text style={styles.title}>Создание профиля</Text>
      <TextInput placeholder="Имя" value={name} onChangeText={setName} style={styles.input} />
      <TextInput placeholder="Год рождения" value={birthYear} onChangeText={setBirthYear} keyboardType="numeric" style={styles.input} />
      <View style={styles.row}>
        <Pressable style={[styles.toggle, type === 'self' && styles.toggleActive]} onPress={() => setType('self')}><Text>Я</Text></Pressable>
        <Pressable style={[styles.toggle, type === 'child' && styles.toggleActive]} onPress={() => setType('child')}><Text>Ребёнок</Text></Pressable>
      </View>
      <Text style={styles.section}>Типы аллергии</Text>
      {allergyOptions.map((item) => (
        <Pressable key={item} style={[styles.option, selected.includes(item) && styles.optionActive]} onPress={() => toggle(item)}>
          <Text>{item}</Text>
        </Pressable>
      ))}
      <Pressable style={styles.button} onPress={save}><Text style={styles.buttonText}>Сохранить профиль</Text></Pressable>
      <Text style={styles.disclaimer}>Профиль используется для персонализации сканера, дневника, отчётов и рекомендаций.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: colors.forest },
  input: { backgroundColor: '#fff', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.foam },
  row: { flexDirection: 'row', gap: 12 },
  toggle: { flex: 1, backgroundColor: '#fff', padding: 14, borderRadius: 14, alignItems: 'center' },
  toggleActive: { borderWidth: 2, borderColor: colors.green },
  section: { marginTop: 8, fontWeight: '700', color: colors.forest },
  option: { padding: 14, borderRadius: 14, backgroundColor: '#fff' },
  optionActive: { backgroundColor: colors.mint },
  button: { marginTop: 8, backgroundColor: colors.forest, padding: 16, borderRadius: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  disclaimer: { fontSize: 12, color: '#5f6d61', marginTop: 8 }
});
