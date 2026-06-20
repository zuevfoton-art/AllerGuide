import { Text, StyleSheet, Linking, Pressable, View } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { Ionicons } from '@expo/vector-icons';
import { parseAllergies, type EmergencyContact } from '@allerguide/core';
import { useAppStore } from '@/src/store/app-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { localizeEmergencyRelation } from '@/src/i18n/content';
import {
  getEmergencyNumber,
  getProfileAge,
  getSosActionPlan,
  getSosNotes,
  listEmergencyContacts,
} from '@/src/services/sos-service';

export default function SosScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, content } = useTranslation();
  const localeContent = content();
  const profile = useAppStore((s) => s.activeProfile);
  const allergies = profile ? parseAllergies(profile.allergies) : [];
  const [emergencyNumber, setEmergencyNumberState] = useState('103');
  const [notes, setNotes] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);

  const refresh = useCallback(() => {
    setEmergencyNumberState(getEmergencyNumber());
    if (!profile) {
      setNotes('');
      setActionPlan('');
      setContacts([]);
      return;
    }
    setNotes(getSosNotes(profile.id));
    setActionPlan(getSosActionPlan(profile.id));
    setContacts(listEmergencyContacts(profile.id));
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const callPhone = (phone: string) => {
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
            <Text style={styles.title}>{t('sos.title')}</Text>
            <Text style={styles.subtitle}>{t('sos.subtitle')}</Text>
          </View>
        </View>
        <Pressable style={styles.editBtn} onPress={() => router.push('/sos-edit' as any)}>
          <Ionicons name="create-outline" size={18} color={theme.colors.accent} />
          <Text style={styles.editBtnText}>{t('sos.edit')}</Text>
        </Pressable>
      </View>

      <ProfileSwitcher />

      {profile ? (
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="person-circle" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.infoLabel}>{t('sos.name')}</Text>
            <Text style={styles.infoValue}>{profile.name}</Text>
          </View>
          {profile.birthYear ? (
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.infoLabel}>{t('sos.age')}</Text>
              <Text style={styles.infoValue}>{getProfileAge(profile.birthYear)}</Text>
            </View>
          ) : null}
          {allergies.length > 0 && (
            <View style={styles.allergySection}>
              <View style={styles.infoRow}>
                <Ionicons name="warning" size={18} color={theme.colors.danger} />
                <Text style={[styles.infoLabel, { color: theme.colors.danger }]}>{t('sos.allergies')}</Text>
              </View>
              <View style={styles.allergyChips}>
                {allergies.map((allergen) => (
                  <View key={allergen} style={styles.allergyChip}>
                    <Text style={styles.allergyText}>{allergen}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {notes ? (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>{t('sos.medicalNotes')}</Text>
              <Text style={styles.notesText}>{notes}</Text>
            </View>
          ) : null}
          {actionPlan ? (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>{t('sos.actionPlan')}</Text>
              <Text style={styles.notesText}>{actionPlan}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="person-add" size={32} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>{t('sos.emptyProfile')}</Text>
        </View>
      )}

      {contacts.length > 0 ? (
        <View style={styles.contactsCard}>
          <Text style={styles.contactsTitle}>{t('sos.contactsTitle')}</Text>
          {contacts.map((contact) => (
            <Pressable
              key={contact.id}
              style={({ pressed }) => [styles.contactRow, pressed && styles.pressed]}
              onPress={() => callPhone(contact.phone)}>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactMeta}>
                  {localizeEmergencyRelation(contact.relation, localeContent)} · {contact.phone}
                </Text>
              </View>
              <Ionicons name="call" size={18} color={theme.colors.accent} />
            </Pressable>
          ))}
        </View>
      ) : profile ? (
        <View style={styles.hintCard}>
          <Ionicons name="people-outline" size={18} color={theme.colors.textSecondary} />
          <Text style={styles.hintText}>{t('sos.contactsHint')}</Text>
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.emergencyBtn, pressed && { opacity: 0.9 }]}
        onPress={() => void Linking.openURL(`tel:${emergencyNumber}`)}>
        <Ionicons name="call" size={22} color={theme.colors.onDanger} />
        <Text style={styles.emergencyText}>{t('sos.call', { number: emergencyNumber })}</Text>
      </Pressable>

      <Pressable style={styles.settingsLink} onPress={() => router.push('/settings' as any)}>
        <Ionicons name="settings-outline" size={16} color={theme.colors.textSecondary} />
        <Text style={styles.settingsLinkText}>{t('sos.settingsLink')}</Text>
      </Pressable>

      <View style={styles.tipCard}>
        <Ionicons name="information-circle" size={18} color={theme.colors.purple} />
        <Text style={styles.tipText}>{t('sos.tip')}</Text>
      </View>

      <Text style={styles.disclaimer}>{t('sos.disclaimer')}</Text>
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
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
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
    notesLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
    notesText: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
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
      gap: 4,
      ...(shadows.sm as object),
    },
    contactsTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    pressed: { opacity: 0.85 },
    contactInfo: { flex: 1, gap: 2 },
    contactName: { fontSize: 15, fontWeight: '700', color: colors.text },
    contactMeta: { fontSize: 13, color: colors.textSecondary },
    hintCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 13,
      borderWidth: 1,
      borderColor: colors.border,
    },
    hintText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
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
      gap: 8,
      paddingVertical: 8,
    },
    settingsLinkText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
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
