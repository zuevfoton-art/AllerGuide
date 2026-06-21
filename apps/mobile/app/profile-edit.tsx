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
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

export default function ProfileEditScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
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
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={ui.docLabel}>AllerGuide · {t('profiles.eyebrow')}</Text>
          <Text style={ui.docTitle}>{t('profileEdit.title')}</Text>
          <Text style={ui.docMeta}>{t('profileEdit.subtitle')}</Text>
        </View>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      ) : (
        <>
          <GlassCard style={styles.section}>
            <Text style={ui.sectionLabel}>{t('profileSetup.nameLabel')}</Text>
            <TextInput
              placeholder={t('profileSetup.namePlaceholder')}
              placeholderTextColor={theme.colors.textMuted}
              value={name}
              onChangeText={setName}
              style={styles.input}
            />

            <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('profileSetup.birthYearLabel')}</Text>
            <TextInput
              placeholder={t('profileSetup.birthYearPlaceholder')}
              placeholderTextColor={theme.colors.textMuted}
              value={birthYear}
              onChangeText={setBirthYear}
              keyboardType="numeric"
              style={styles.input}
            />

            <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('profileSetup.profileLabel')}</Text>
            <View style={ui.toggleRow}>
              <Pressable
                style={[ui.toggle, type === 'self' && ui.toggleActive]}
                onPress={() => setType('self')}>
                <Ionicons
                  name="person"
                  size={16}
                  color={type === 'self' ? theme.colors.onAccent : theme.colors.textMuted}
                />
                <Text style={[ui.toggleText, type === 'self' && ui.toggleTextActive]}>
                  {t('profileSetup.profileSelf')}
                </Text>
              </Pressable>
              <Pressable
                style={[ui.toggle, type === 'child' && ui.toggleActive]}
                onPress={() => setType('child')}>
                <Ionicons
                  name="happy"
                  size={16}
                  color={type === 'child' ? theme.colors.onAccent : theme.colors.textMuted}
                />
                <Text style={[ui.toggleText, type === 'child' && ui.toggleTextActive]}>
                  {t('profileSetup.profileChild')}
                </Text>
              </Pressable>
            </View>
          </GlassCard>

          <GlassCard style={styles.section}>
            <Text style={ui.sectionLabel}>{t('profileSetup.allergensLabel')}</Text>
            <AllergenPicker selected={selected} onChange={setSelected} />
          </GlassCard>

          <GlassCard style={styles.section}>
            <Text style={ui.sectionLabel}>{t('profileSetup.contactsLabel')}</Text>
            <EmergencyContactsEditor contacts={contacts} onChange={setContacts} />
          </GlassCard>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label={t('profileEdit.saveChanges')} variant="primary" block onPress={save} />
        </>
      )}
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
    loadingText: {
      fontFamily: fonts.sans,
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 24,
    },
    section: { gap: 8 },
    fieldGap: { marginTop: 12 },
    input: {
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 6,
      fontSize: 16,
      fontFamily: fonts.sans,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    error: {
      fontFamily: fonts.sans,
      color: colors.danger,
      fontSize: 14,
      textAlign: 'center',
    },
  });
}
