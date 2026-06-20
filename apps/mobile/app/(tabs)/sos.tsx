import { Text, StyleSheet, Linking, Pressable, View } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { Ionicons } from '@expo/vector-icons';
import { parseAllergies } from '@allerguide/core';
import { useAppStore } from '@/src/store/app-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import {
  getEmergencyNumber,
  getProfileAge,
  getSosNotes,
  listEmergencyContacts,
} from '@/src/services/sos-service';
import type { EmergencyContact } from '@allerguide/core';

export default function SosScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const profile = useAppStore((s) => s.activeProfile);
  const allergies = profile ? parseAllergies(profile.allergies) : [];
  const [emergencyNumber, setEmergencyNumberState] = useState('103');
  const [notes, setNotes] = useState('');
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);

  const refresh = useCallback(() => {
    setEmergencyNumberState(getEmergencyNumber());
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

  const callEmergency = () => {
    void Linking.openURL(`tel:${emergencyNumber}`);
  };

  const callContact = (phone: string) => {
    void Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={styles.header}>
          <View style={styles.sosIconWrap}>
            <Ionicons name="medkit" size={30} color={theme.colors.danger} />
          </View>
          <View>
            <Text style={styles.title}>SOS</Text>
            <Text style={styles.subtitle}>Экстренная информация</Text>
          </View>
        </View>
        <Pressable style={styles.editBtn} onPress={() => router.push('/sos-edit')}>
          <Ionicons name="create-outline" size={18} color={theme.colors.accent} />
          <Text style={styles.editBtnText}>Изменить</Text>
        </Pressable>
      </View>

      <ProfileSwitcher />

      {profile ? (
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="person-circle" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.infoLabel}>Имя:</Text>
            <Text style={styles.infoValue}>{profile.name}</Text>
          </View>
          {profile.birthYear ? (
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.infoLabel}>Возраст:</Text>
              <Text style={styles.infoValue}>{getProfileAge(profile.birthYear)}</Text>
            </View>
          ) : null}
          {allergies.length > 0 && (
            <View style={styles.allergySection}>
              <View style={styles.infoRow}>
                <Ionicons name="warning" size={18} color={theme.colors.danger} />
                <Text style={[styles.infoLabel, { color: theme.colors.danger }]}>Аллергии:</Text>
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
          {notes ? (
            <View style={styles.notesSection}>
              <View style={styles.infoRow}>
                <Ionicons name="document-text" size={18} color={theme.colors.purple} />
                <Text style={styles.infoLabel}>Заметки:</Text>
              </View>
              <Text style={styles.notesText}>{notes}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="person-add" size={32} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>Выберите профиль, чтобы увидеть медицинскую информацию</Text>
        </View>
      )}

      {contacts.length > 0 ? (
        <View style={styles.contactsCard}>
          <Text style={styles.contactsTitle}>Экстренные контакты</Text>
          {contacts.map((contact) => (
            <Pressable
              key={contact.id}
              style={styles.contactRow}
              onPress={() => callContact(contact.phone)}>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactMeta}>
                  {contact.relation} · {contact.phone}
                </Text>
              </View>
              <Ionicons name="call" size={18} color={theme.colors.accent} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.emergencyBtn, pressed && { opacity: 0.9 }]}
        onPress={callEmergency}>
        <Ionicons name="call" size={22} color={theme.colors.onDanger} />
        <Text style={styles.emergencyText}>Позвонить {emergencyNumber}</Text>
      </Pressable>

      <Pressable style={styles.settingsLink} onPress={() => router.push('/settings')}>
        <Ionicons name="settings-outline" size={16} color={theme.colors.textSecondary} />
        <Text style={styles.settingsLinkText}>Настройки SOS и уведомлений</Text>
      </Pressable>

      <View style={styles.tipCard}>
        <Ionicons name="information-circle" size={18} color={theme.colors.purple} />
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

function createStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
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
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.accentLight,
    },
    editBtnText: { color: colors.accent, fontWeight: '700', fontSize: 13 },
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
      borderColor: colors.dangerBorder,
    },
    allergyText: { fontSize: 13, color: colors.danger, fontWeight: '600' },
    notesSection: { gap: 6 },
    notesText: { fontSize: 14, color: colors.text, lineHeight: 20 },
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 24,
      alignItems: 'center',
      gap: 10,
    },
    emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
    contactsCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      gap: 10,
      ...(shadows.sm as object),
    },
    contactsTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    contactInfo: { flex: 1, gap: 2 },
    contactName: { fontSize: 14, fontWeight: '700', color: colors.text },
    contactMeta: { fontSize: 12, color: colors.textSecondary },
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
    emergencyText: { color: colors.onDanger, fontWeight: '800', fontSize: 18 },
    settingsLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    settingsLinkText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
    tipCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: colors.tipBg,
      borderRadius: 14,
      padding: 13,
      borderWidth: 1,
      borderColor: colors.tipBorder,
    },
    tipText: { fontSize: 13, color: colors.tipText, lineHeight: 18, flex: 1 },
    disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  });
}
