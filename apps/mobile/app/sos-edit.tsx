import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Screen } from '@/src/components/Screen';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/src/store/app-store';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { localizeEmergencyRelation } from '@/src/i18n/content';
import {
  addEmergencyContact,
  deleteEmergencyContact,
  getSosNotes,
  listEmergencyContacts,
  saveSosNotes,
  getSosActionPlan,
  saveSosActionPlan,
} from '@/src/services/sos-service';
import type { EmergencyContact, EmergencyContactRelation } from '@allerguide/core';

export default function SosEditScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, tSosError, content } = useTranslation();
  const localeContent = content();
  const profile = useAppStore((s) => s.activeProfile);
  const [notes, setNotes] = useState('');
  const [plan, setPlan] = useState('');
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState<EmergencyContactRelation>('relative');
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    if (!profile) {
      setNotes('');
      setPlan('');
      setContacts([]);
      return;
    }
    setNotes(getSosNotes(profile.id));
    setPlan(getSosActionPlan(profile.id));
    setContacts(listEmergencyContacts(profile.id));
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const saveNotes = () => {
    if (!profile) {
      setError(t('errors.selectProfile'));
      return;
    }
    saveSosNotes(profile.id, notes);
    setError('');
    Alert.alert(t('settings.saved'), t('sosEdit.savedNotes'));
  };

  const savePlan = () => {
    if (!profile) {
      setError(t('errors.selectProfile'));
      return;
    }
    saveSosActionPlan(profile.id, plan);
    setError('');
    Alert.alert(t('settings.saved'), t('sosEdit.savedPlan'));
  };

  const addContact = () => {
    if (!profile) {
      setError(t('errors.selectProfile'));
      return;
    }
    if (!name.trim() || !phone.trim()) {
      setError(t('sosEdit.errors.contactRequired'));
      return;
    }

    addEmergencyContact({
      profileId: profile.id,
      name: name.trim(),
      phone: phone.trim(),
      relation,
    });
    setName('');
    setPhone('');
    setRelation('relative');
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
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={ui.docLabel}>AllerGuide · {t('sosEdit.eyebrow')}</Text>
          <Text style={ui.docTitle}>{t('sosEdit.title')}</Text>
          <Text style={ui.docMeta}>{profile ? profile.name : t('sosEdit.noProfile')}</Text>
        </View>
      </View>

      <Text style={ui.sectionLabel}>{t('sosEdit.notesLabel')}</Text>
      <GlassCard style={styles.section}>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('sosEdit.notesPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
        />
        <Button label={t('sosEdit.saveNotes')} variant="primary" block onPress={saveNotes} />
      </GlassCard>

      <Text style={ui.sectionLabel}>{t('sosEdit.planLabel')}</Text>
      <GlassCard style={styles.section}>
        <TextInput
          style={styles.notesInput}
          value={plan}
          onChangeText={setPlan}
          placeholder={t('sosEdit.planPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
        />
        <Button label={t('sosEdit.savePlan')} variant="primary" block onPress={savePlan} />
      </GlassCard>

      <Text style={ui.sectionLabel}>{t('sosEdit.contactsLabel')}</Text>

      {contacts.map((contact) => (
        <GlassCard key={contact.id} style={styles.contactCard}>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>{contact.name}</Text>
            <Text style={styles.contactMeta}>
              {localizeEmergencyRelation(contact.relation, localeContent)} · {contact.phone}
            </Text>
          </View>
          <Pressable onPress={() => removeContact(contact.id)} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
          </Pressable>
        </GlassCard>
      ))}

      <GlassCard style={styles.section}>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('common.name')}
          placeholderTextColor={theme.colors.textMuted}
        />
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder={t('common.phone')}
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          value={relation}
          onChangeText={(value) => setRelation(value as EmergencyContactRelation)}
          placeholder="relative / trusted / doctor"
          placeholderTextColor={theme.colors.textMuted}
        />
        <Button
          label={t('sosEdit.addContact')}
          variant="secondary"
          block
          onPress={addContact}
        />
      </GlassCard>

      {error ? <Text style={styles.error}>{tSosError(error)}</Text> : null}
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 6,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 2,
    },
    headerText: { flex: 1, gap: 2 },
    section: { gap: 10 },
    notesInput: {
      minHeight: 120,
      backgroundColor: colors.card,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.borderInput,
      padding: 14,
      fontSize: 15,
      fontFamily: fonts.sans,
      color: colors.text,
      textAlignVertical: 'top',
    },
    contactCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    contactInfo: { flex: 1, gap: 2 },
    contactName: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    contactMeta: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.borderInput,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: fonts.sans,
      color: colors.text,
    },
    error: {
      fontFamily: fonts.sansSemiBold,
      color: colors.danger,
      fontSize: 13,
      fontWeight: '600',
    },
  });
}
