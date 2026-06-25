import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  getWizardStep,
  needsChildConsent,
  normalizeAllergyConfirmations,
  shouldCompleteOnboarding,
  type AllergyConditionId,
  type AllergyConfirmationSource,
  type ProfileType,
} from '@allerguide/core';
import { AllergenPicker } from '@/src/components/AllergenPicker';
import { AllergyConfirmationEditor } from '@/src/components/AllergyConfirmationEditor';
import { ConditionPicker } from '@/src/components/ConditionPicker';
import { createProfile, listProfiles, ProfileValidationError } from '@/src/services/profile-service';
import { setStoredProfileConditions } from '@/src/services/profile-conditions-service';
import {
  normalizeEmergencyContactDrafts,
  syncEmergencyContacts,
  type EmergencyContactDraft,
} from '@/src/services/emergency-contact-service';
import { EmergencyContactsEditor } from '@/src/components/EmergencyContactsEditor';
import { getStoredScenario, markOnboardingComplete } from '@/src/services/settings-service';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

function validateProfileInput(name: string, birthYear: string, selected: string[]) {
  const trimmedName = name.trim();
  const year = Number(birthYear);

  if (!trimmedName) return 'name_required';
  if (!birthYear || Number.isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
    return 'birth_year_invalid';
  }
  if (selected.length === 0) return 'allergen_required';
  return null;
}

export default function ProfileSetupScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, tProfileError } = useTranslation();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isAddingProfile = params.mode === 'add';
  const scenario = useAppStore((s) => s.scenario) ?? getStoredScenario();
  const setActiveProfileId = useAppStore((s) => s.setActiveProfileId);
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmations, setConfirmations] = useState<Record<string, AllergyConfirmationSource>>({});
  const [conditions, setConditions] = useState<AllergyConditionId[]>([]);
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
    setConditions([]);
    setContacts([]);
    setConfirmations({});
    setError('');
  };

  const save = async () => {
    const validationError = validateProfileInput(name, birthYear, selected);
    if (validationError) {
      setError(tProfileError(validationError));
      return;
    }

    if (needsChildConsent(effectiveType, scenario) && !childConsent) {
      setError(tProfileError('child_consent_required'));
      return;
    }

    setError('');

    let id: number | null;
    try {
      id = await createProfile({
        name: name.trim(),
        birthYear: Number(birthYear),
        type: effectiveType,
        allergies: selected,
        allergyConfirmations: normalizeAllergyConfirmations(selected, confirmations),
        childConsent,
        scenario,
      });
    } catch (err) {
      if (err instanceof ProfileValidationError) {
        setError(tProfileError(err.code));
        return;
      }
      setError(err instanceof Error ? err.message : t('profileSetup.errors.saveFailed'));
      return;
    }

    if (!id) {
      setError(t('profileSetup.errors.saveFailed'));
      return;
    }

    setStoredProfileConditions(id, conditions);
    syncEmergencyContacts(id, normalizeEmergencyContactDrafts(contacts));

    setActiveProfileId(id);
    const profiles = listProfiles();

    if (isAddingProfile) {
      markOnboardingComplete();
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/home');
      }
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
        <Text style={ui.docLabel}>AllerGuide · {t('profileSetup.eyebrow')}</Text>
        <Text style={ui.docTitle}>{title}</Text>
        <Text style={ui.docMeta}>{subtitle}</Text>
      </View>

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

        {canToggleType ? (
          <>
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
          </>
        ) : (
          <View style={styles.lockedType}>
            <Ionicons
              name={lockedType === 'self' ? 'person' : 'happy'}
              size={16}
              color={theme.colors.accent}
            />
            <Text style={styles.lockedTypeText}>
              {lockedType === 'self'
                ? t('profileSetup.profileSelfLocked')
                : t('profileSetup.profileChildLocked')}
            </Text>
          </View>
        )}
      </GlassCard>

      <GlassCard style={styles.section}>
        <Text style={ui.sectionLabel}>{t('profileSetup.conditionsLabel')}</Text>
        <ConditionPicker selected={conditions} onChange={setConditions} />
      </GlassCard>

      <GlassCard style={styles.section}>
        <Text style={ui.sectionLabel}>{t('profileSetup.allergensLabel')}</Text>
        <AllergenPicker
          selected={selected}
          onChange={(ids) => {
            setSelected(ids);
            setConfirmations((prev) => normalizeAllergyConfirmations(ids, prev));
          }}
        />
        <AllergyConfirmationEditor
          selected={selected}
          confirmations={confirmations}
          onChange={setConfirmations}
        />
      </GlassCard>

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

      <GlassCard style={styles.section}>
        <Text style={ui.sectionLabel}>{t('profileSetup.contactsLabel')}</Text>
        <EmergencyContactsEditor contacts={contacts} onChange={setContacts} />
      </GlassCard>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label={
          scenario === 'both' && wizardStep === 'self'
            ? t('profileSetup.nextChild')
            : t('profileSetup.saveProfile')
        }
        variant="primary"
        block
        onPress={save}
      />

      <Disclaimer>{t('profileSetup.disclaimer')}</Disclaimer>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    header: { gap: 2, marginBottom: 4 },
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
    lockedType: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.accentLight,
      padding: 14,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.accentMid,
      marginTop: 12,
    },
    lockedTypeText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.accent,
    },
    consentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    consentText: {
      flex: 1,
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    error: {
      fontFamily: fonts.sans,
      color: colors.danger,
      fontSize: 14,
      textAlign: 'center',
    },
  });
}
