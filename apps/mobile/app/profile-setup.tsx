import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { getWizardStep, shouldCompleteOnboarding, type ProfileType } from '@allerguide/core';
import { AllergenPicker } from '@/src/components/AllergenPicker';
import { createProfile, listProfiles } from '@/src/services/profile-service';
import {
  normalizeEmergencyContactDrafts,
  syncEmergencyContacts,
  type EmergencyContactDraft,
} from '@/src/services/emergency-contact-service';
import { EmergencyContactsEditor } from '@/src/components/EmergencyContactsEditor';
import { getStoredScenario, isOnboardingComplete, markOnboardingComplete } from '@/src/services/settings-service';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

function validateProfileInput(name: string, birthYear: string, selected: string[]) {
  const trimmedName = name.trim();
  const year = Number(birthYear);

  if (!trimmedName) return 'Укажите имя профиля.';
  if (!birthYear || Number.isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
    return 'Укажите корректный год рождения.';
  }
  if (selected.length === 0) return 'Выберите хотя бы один аллерген.';
  return '';
}

function needsChildConsent(type: ProfileType, scenario: ReturnType<typeof getStoredScenario>) {
  return type === 'child' || scenario === 'child';
}

export default function ProfileSetupScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, tProfileError } = useTranslation();
  const scenario = useAppStore((s) => s.scenario) ?? getStoredScenario();
  const setActiveProfileId = useAppStore((s) => s.setActiveProfileId);
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [contacts, setContacts] = useState<EmergencyContactDraft[]>([]);
  const [childConsent, setChildConsent] = useState(false);
  const [error, setError] = useState('');
  const [, setRefreshKey] = useState(0);

  const wizardStep = getWizardStep(scenario, listProfiles());

  const lockedType: ProfileType =
    scenario === 'child' || wizardStep === 'child' ? 'child' : 'self';

  const canToggleType = scenario !== 'self' && scenario !== 'child' && scenario !== 'both';
  const [type, setType] = useState<ProfileType>(lockedType);
  const effectiveType = canToggleType ? type : lockedType;

  const title =
    scenario === 'both' && wizardStep === 'child'
      ? t('profileSetup.titleChild')
      : scenario === 'both'
        ? t('profileSetup.titleSelf')
        : t('profileSetup.titleCreate');

  const subtitle =
    scenario === 'both' && wizardStep === 'child'
      ? t('profileSetup.subtitleChildStep')
      : scenario === 'both'
        ? t('profileSetup.subtitleSelfStep')
        : t('profileSetup.subtitleDefault');

  const resetForm = () => {
    setName('');
    setBirthYear('');
    setSelected([]);
    setContacts([]);
    setError('');
  };

  const save = async () => {
    const validationError = validateProfileInput(name, birthYear, selected);
    if (validationError) {
      setError(tProfileError(validationError));
      return;
    }

    if (needsChildConsent(effectiveType, scenario) && !childConsent) {
      setError(t('profileSetup.errors.consentRequired'));
      return;
    }

    setError('');
    const id = await createProfile({
      name: name.trim(),
      birthYear: Number(birthYear),
      type: effectiveType,
      allergies: selected,
    });

    if (!id) return;

    syncEmergencyContacts(id, normalizeEmergencyContactDrafts(contacts));

    setActiveProfileId(id);
    const profiles = listProfiles();

    if (isOnboardingComplete()) {
      router.back();
      return;
    }

    if (shouldCompleteOnboarding(scenario, profiles)) {
      markOnboardingComplete();
      router.replace('/(tabs)/home');
      return;
    }

    resetForm();
    setRefreshKey((key) => key + 1);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

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

      {canToggleType ? (
        <>
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
        </>
      ) : (
        <View style={styles.lockedType}>
          <Ionicons
            name={lockedType === 'self' ? 'person' : 'happy'}
            size={16}
            color={theme.colors.accent}
          />
          <Text style={styles.lockedTypeText}>
            {lockedType === 'self' ? t('profileSetup.profileSelfLocked') : t('profileSetup.profileChildLocked')}
          </Text>
        </View>
      )}

      <Text style={styles.label}>{t('profileSetup.allergensLabel')}</Text>
      <AllergenPicker selected={selected} onChange={setSelected} />

      {needsChildConsent(effectiveType, scenario) ? (
        <Pressable style={styles.consentRow} onPress={() => setChildConsent((v) => !v)}>
          <Ionicons
            name={childConsent ? 'checkbox' : 'square-outline'}
            size={22}
            color={theme.colors.accent}
          />
          <Text style={styles.consentText}>{t('profileSetup.consent')}</Text>
        </Pressable>
      ) : null}

      <Text style={styles.label}>{t('profileSetup.contactsLabel')}</Text>
      <EmergencyContactsEditor contacts={contacts} onChange={setContacts} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>
          {scenario === 'both' && wizardStep === 'self' ? t('profileSetup.nextChild') : t('profileSetup.saveProfile')}
        </Text>
      </Pressable>

      <Text style={styles.disclaimer}>{t('profileSetup.disclaimer')}</Text>
    </Screen>
  );
}

function createStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
    header: { gap: 4, marginBottom: 4 },
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
    lockedType: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.accentLight,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.accentMid,
    },
    lockedTypeText: { fontSize: 15, fontWeight: '600', color: colors.accent },
    consentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    consentText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
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
    disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  });
}
