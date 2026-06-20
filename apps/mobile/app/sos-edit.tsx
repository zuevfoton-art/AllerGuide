import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Screen } from '@/src/components/Screen';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/src/store/app-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import {
  addEmergencyContact,
  deleteEmergencyContact,
  getSosNotes,
  listEmergencyContacts,
  saveSosNotes,
} from '@/src/services/sos-service';
import type { EmergencyContact } from '@allerguide/core';

export default function SosEditScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const profile = useAppStore((s) => s.activeProfile);
  const [notes, setNotes] = useState('');
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    if (!profile) {
      setNotes('');
      setContacts([]);
      return;
    }
    setNotes(getSosNotes(profile.id));
    setContacts(listEmergencyContacts(profile.id));
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const saveNotes = () => {
    if (!profile) {
      setError('Выберите профиль на главном экране.');
      return;
    }
    saveSosNotes(profile.id, notes);
    setError('');
    Alert.alert('Сохранено', 'Заметки SOS обновлены.');
  };

  const addContact = () => {
    if (!profile) {
      setError('Выберите профиль на главном экране.');
      return;
    }
    if (!name.trim() || !phone.trim()) {
      setError('Укажите имя и телефон контакта.');
      return;
    }

    addEmergencyContact({
      profileId: profile.id,
      name: name.trim(),
      phone: phone.trim(),
      relation: relation.trim() || 'Контакт',
    });
    setName('');
    setPhone('');
    setRelation('');
    setError('');
    refresh();
  };

  const removeContact = (id: number) => {
    deleteEmergencyContact(id);
    refresh();
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View>
          <Text style={styles.title}>Редактирование SOS</Text>
          <Text style={styles.subtitle}>
            {profile ? profile.name : 'Профиль не выбран'}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Медицинские заметки</Text>
      <TextInput
        style={styles.notesInput}
        value={notes}
        onChangeText={setNotes}
        placeholder="Препараты, особенности реакции, инструкции врача…"
        placeholderTextColor={theme.colors.textMuted}
        multiline
      />
      <Pressable style={styles.primaryBtn} onPress={saveNotes}>
        <Text style={styles.primaryBtnText}>Сохранить заметки</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>Экстренные контакты</Text>

      {contacts.map((contact) => (
        <View key={contact.id} style={styles.contactCard}>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>{contact.name}</Text>
            <Text style={styles.contactMeta}>
              {contact.relation} · {contact.phone}
            </Text>
          </View>
          <Pressable onPress={() => removeContact(contact.id)}>
            <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
          </Pressable>
        </View>
      ))}

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Имя"
          placeholderTextColor={theme.colors.textMuted}
        />
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Телефон"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          value={relation}
          onChangeText={setRelation}
          placeholder="Кто это (мама, врач…)"
          placeholderTextColor={theme.colors.textMuted}
        />
        <Pressable style={styles.secondaryBtn} onPress={addContact}>
          <Ionicons name="person-add" size={16} color={theme.colors.accent} />
          <Text style={styles.secondaryBtnText}>Добавить контакт</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

function createStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
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
    title: { fontSize: 24, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: 14, color: colors.textSecondary },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    notesInput: {
      minHeight: 120,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      fontSize: 15,
      color: colors.text,
      textAlignVertical: 'top',
    },
    primaryBtn: {
      backgroundColor: colors.accent,
      borderRadius: 14,
      padding: 14,
      alignItems: 'center',
      ...(shadows.accent as object),
    },
    primaryBtnText: { color: colors.onAccent, fontWeight: '700', fontSize: 15 },
    contactCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    contactInfo: { flex: 1, gap: 2 },
    contactName: { fontSize: 15, fontWeight: '700', color: colors.text },
    contactMeta: { fontSize: 12, color: colors.textSecondary },
    form: { gap: 10 },
    input: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.accentLight,
    },
    secondaryBtnText: { color: colors.accent, fontWeight: '700' },
    error: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  });
}
