import { Text, TextInput, Pressable, StyleSheet, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { addDiaryEntry, getDiaryEntries, generateDoctorPdf } from '@/src/services/diary-service';
import { useAppStore } from '@/src/store/app-store';
import { colors, shadows } from '@/src/constants/theme';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { Ionicons } from '@expo/vector-icons';

const TYPES = ['Симптомы', 'Лекарство', 'Питание', 'Триггер', 'Кожа', 'Заметка'];

const typeConfig: Record<string, { icon: string; color: string }> = {
  Симптомы: { icon: 'pulse', color: colors.danger },
  Лекарство: { icon: 'medkit', color: '#5856D6' },
  Питание: { icon: 'restaurant', color: colors.accent },
  Триггер: { icon: 'warning', color: colors.warning },
  Кожа: { icon: 'body', color: '#FF2D55' },
  Заметка: { icon: 'create', color: colors.success },
};

export default function DiaryScreen() {
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const [type, setType] = useState('Симптомы');
  const [details, setDetails] = useState('');
  const [list, setList] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!activeProfileId) return;
    setList(await getDiaryEntries(activeProfileId));
  }, [activeProfileId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!activeProfileId) return;
    await addDiaryEntry({ profileId: activeProfileId, type, details, createdAt: new Date().toISOString() });
    setDetails('');
    await load();
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Дневник</Text>
        <Text style={styles.subtitle}>Записи наблюдений</Text>
      </View>

      <ProfileSwitcher />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Тип записи</Text>
        <View style={styles.chips}>
          {TYPES.map((item) => {
            const cfg = typeConfig[item];
            const active = type === item;
            return (
              <Pressable
                key={item}
                style={[styles.chip, active && { backgroundColor: `${cfg.color}18`, borderColor: cfg.color }]}
                onPress={() => setType(item)}>
                <Ionicons name={cfg.icon as any} size={13} color={active ? cfg.color : colors.textMuted} />
                <Text style={[styles.chipText, active && { color: cfg.color, fontWeight: '700' }]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <TextInput
        value={details}
        onChangeText={setDetails}
        placeholder="Опишите наблюдение..."
        placeholderTextColor={colors.textMuted}
        multiline
        style={styles.input}
      />

      <Pressable style={styles.button} onPress={save}>
        <Ionicons name="add-circle" size={18} color="#fff" />
        <Text style={styles.buttonText}>Сохранить запись</Text>
      </Pressable>

      <View style={styles.row}>
        <Pressable style={styles.secondaryBtn} onPress={load}>
          <Ionicons name="refresh" size={16} color={colors.accent} />
          <Text style={styles.secondaryText}>Обновить</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => activeProfileId && generateDoctorPdf(activeProfileId)}>
          <Ionicons name="document-text" size={16} color={colors.accent} />
          <Text style={styles.secondaryText}>PDF-отчёт</Text>
        </Pressable>
      </View>

      {list.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>История записей</Text>
          {list.map((item) => {
            const cfg = typeConfig[item.type] ?? { icon: 'create', color: colors.textSecondary };
            return (
              <View key={item.id} style={styles.card}>
                <View style={[styles.cardDot, { backgroundColor: `${cfg.color}18` }]}>
                  <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardType}>{item.type}</Text>
                  <Text style={styles.cardDetails}>{item.details}</Text>
                  <Text style={styles.cardMeta}>{item.createdAt}</Text>
                </View>
              </View>
            );
          })}
        </>
      )}

      <Text style={styles.disclaimer}>
        Дневник отражает только наблюдения пользователя и не заменяет медицинскую документацию.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 3 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  section: { gap: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  input: {
    minHeight: 110,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 15,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
    borderWidth: 1.5,
    borderColor: colors.border,
    lineHeight: 22,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    padding: 16,
    borderRadius: 16,
    ...(shadows.accent as object),
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  row: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accentLight,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.accentMid,
  },
  secondaryText: { color: colors.accent, fontWeight: '600', fontSize: 14 },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 16,
    alignItems: 'flex-start',
    ...(shadows.xs as object),
  },
  cardDot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardBody: { flex: 1, gap: 4 },
  cardType: { fontSize: 14, fontWeight: '700', color: colors.text },
  cardDetails: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  cardMeta: { fontSize: 11, color: colors.textMuted },
  disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
