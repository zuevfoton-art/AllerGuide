import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { type ProfileType } from '@allerguide/core';
import { AllergenPicker } from '@/src/components/AllergenPicker';
import { getProfile, updateProfile } from '@/src/services/profile-service';
import {
  listEmergencyContacts,
  normalizeEmergencyContactDrafts,
  syncEmergencyContacts,
  type EmergencyContactDraft,
} from '@/src/services/emergency-contact-service';
import { EmergencyContactsEditor } from '@/src/components/EmergencyContactsEditor';
import { Screen } from '@/src/components/Screen';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

export default function ProfileEditScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, tProfileError } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const profileId = Number(id);
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [type, setType] = useState<ProfileType>('self');
  const [selected, setSelected] = useState<string[]>([]);
  const [contacts, setContacts] = useState<EmergencyContactDraft[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void getProfile(profileId).then((row) => {
      if (!row) {
        setLoading(false);
        return;
      }

      setName(row.name);
      setBirthYear(String(row.birthYear));
      setType(row.type);
      try {
        setSelected(JSON.parse(row.allergies));
      } catch {
        setSelected([]);
      }
      setContacts(
        listEmergencyContacts(profileId).map((contact) => ({
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          relation: contact.relation,
        })),
      );
      setLoading(false);
    });
  }, [profileId]);

  const save = async () => {
    const trimmedName = name.trim();
    const year = Number(birthYear);

    if (!trimmedName) {
      setError(t('profileEdit.errors.nameRequired'));
      return;
    }
    if (!birthYear || Number.isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
      setError(t('profileEdit.errors.birthYearInvalid'));
      return;
    }
    if (selected.length === 0) {
      setError(t('profileEdit.errors.allergenRequired'));
      return;
    }

    setError('');
    await updateProfile(profileId, {
      name: trimmedName,
      birthYear: year,
      type,
      allergies: selected,
    });
    syncEmergencyContacts(profileId, normalizeEmergencyContactDrafts(contacts));
    router.back();
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View>
          <Text style={styles.title}>{t('profileEdit.title')}</Text>
          <Text style={styles.subtitle}>{t('profileEdit.subtitle')}</Text>
        </View>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      ) : (
        <>
          <Text style={styles.label}>{t('profileSetup.nameLabel')}</Text>
          <TextInput
            placeholder={t('profileSetup.namePlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <Text style={styles.label}>{t('profileSetup.birthYearLabel')}</Text>
          <TextInput
            placeholder={t('profileSetup.birthYearPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            value={birthYear}
            onChangeText={setBirthYear}
            keyboardType="numeric"
            style={styles.input}
          />

          <Text style={styles.label}>{t('profileSetup.profileLabel')}</Text>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, type === 'self' && styles.toggleActive]}
              onPress={() => setType('self')}>
              <Ionicons
                name="person"
                size={16}
                color={type === 'self' ? theme.colors.accent : theme.colors.textSecondary}
              />
              <Text style={[styles.toggleText, type === 'self' && styles.toggleTextActive]}>
                {t('profileSetup.profileSelf')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, type === 'child' && styles.toggleActive]}
              onPress={() => setType('child')}>
              <Ionicons
                name="happy"
                size={16}
                color={type === 'child' ? theme.colors.accent : theme.colors.textSecondary}
              />
              <Text style={[styles.toggleText, type === 'child' && styles.toggleTextActive]}>
                {t('profileSetup.profileChild')}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.label}>{t('profileSetup.allergensLabel')}</Text>
          <AllergenPicker selected={selected} onChange={setSelected} />

          <Text style={styles.label}>{t('profileSetup.contactsLabel')}</Text>
          <EmergencyContactsEditor contacts={contacts} onChange={setContacts} />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.button} onPress={save}>
            <Text style={styles.buttonText}>{t('profileEdit.saveChanges')}</Text>
          </Pressable>
        </>
      )}
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
    title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: colors.textSecondary },
    loadingText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', paddingVertical: 24 },
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
    button: {
      backgroundColor: colors.accent,
      padding: 17,
      borderRadius: 16,
      alignItems: 'center',
      marginTop: 4,
      ...(shadows.accent as object),
    },
    buttonText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
    error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
  });
}
