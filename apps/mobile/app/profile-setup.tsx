import { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  getWizardStep,
  needsChildConsent,
  normalizeAllergyConfirmations,
  shouldCompleteOnboarding,
  type AllergyConditionId,
  type AllergyConfirmationSource,
  type ComorbidityLink,
  type ProfileType,
} from '@allerguide/core';
import { createProfile, listProfiles, ProfileValidationError } from '@/src/services/profile-service';
import { setStoredProfileConditions } from '@/src/services/profile-conditions-service';
import { saveConditionHistoryFromOnboarding } from '@/src/services/condition-history-service';
import {
  normalizeEmergencyContactDrafts,
  syncEmergencyContacts,
  type EmergencyContactDraft,
} from '@/src/services/emergency-contact-service';
import { getStoredScenario, markOnboardingComplete } from '@/src/services/settings-service';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { ScreenEyebrow } from '@/src/components/ScreenEyebrow';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { ProfileSetupNameStep } from '@/src/components/profile-setup/ProfileSetupNameStep';
import { ProfileSetupBirthYearStep } from '@/src/components/profile-setup/ProfileSetupBirthYearStep';
import { ProfileSetupConditionsStep } from '@/src/components/profile-setup/ProfileSetupConditionsStep';
import { ProfileSetupAllergensStep } from '@/src/components/profile-setup/ProfileSetupAllergensStep';
import { ProfileSetupConditionHistoryStep } from '@/src/components/profile-setup/ProfileSetupConditionHistoryStep';
import type { ConditionHistoryDrafts } from '@/src/components/ConditionHistoryEditor';
import {
  getNextProfileSetupWizardStep,
  getPreviousProfileSetupWizardStep,
  PROFILE_SETUP_WIZARD_STEP_COUNT,
  PROFILE_SETUP_WIZARD_STEPS,
  buildProfileSetupWizardNavOptions,
  reconcileComorbidityLinks,
  reconcileConditionHistoryDrafts,
  validateProfileSetupWizardDraft,
  validateProfileSetupWizardStep,
  type ProfileSetupWizardStep,
} from '@/src/hooks/use-profile-setup-wizard';
import { ProfileSetupContactsStep } from '@/src/components/profile-setup/ProfileSetupContactsStep';
import { ProfileSetupComorbidityStep } from '@/src/components/profile-setup/ProfileSetupComorbidityStep';
import { ProfileSetupPhenotypeStep } from '@/src/components/profile-setup/ProfileSetupPhenotypeStep';

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
  const [conditionHistoryDrafts, setConditionHistoryDrafts] = useState<ConditionHistoryDrafts>({});
  const [comorbidityLinks, setComorbidityLinks] = useState<ComorbidityLink[]>([]);
  const [contacts, setContacts] = useState<EmergencyContactDraft[]>([]);
  const [childConsent, setChildConsent] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState<ProfileSetupWizardStep>('name');
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

  const stepIndex = PROFILE_SETUP_WIZARD_STEPS.indexOf(currentStep);
  const stepProgress = t('profileSetup.stepProgress', {
    current: stepIndex + 1,
    total: PROFILE_SETUP_WIZARD_STEP_COUNT,
  });

  const subtitle =
    scenario === 'both' && wizardStep === 'child'
      ? t('profileSetup.subtitleChildStep', { step: stepProgress })
      : scenario === 'both'
        ? t('profileSetup.subtitleSelfStep', { step: stepProgress })
        : t('profileSetup.subtitleDefault', { step: stepProgress });

  const draft = useMemo(
    () => ({
      name,
      birthYear,
      selectedAllergenIds: selected,
      confirmations,
      conditions,
      conditionHistoryDrafts,
      comorbidityLinks,
      contacts,
      childConsent,
      profileType: effectiveType,
    }),
    [name, birthYear, selected, confirmations, conditions, conditionHistoryDrafts, comorbidityLinks, contacts, childConsent, effectiveType],
  );

  const wizardNav = buildProfileSetupWizardNavOptions(draft);

  const handleConditionsChange = (next: AllergyConditionId[]) => {
    setConditions(next);
    setConditionHistoryDrafts((prev) => reconcileConditionHistoryDrafts(next, prev));
    setComorbidityLinks((prev) => reconcileComorbidityLinks(next, prev));
  };

  const resetForm = () => {
    setName('');
    setBirthYear('');
    setSelected([]);
    setConditions([]);
    setConditionHistoryDrafts({});
    setComorbidityLinks([]);
    setContacts([]);
    setConfirmations({});
    setChildConsent(false);
    setCurrentStep('name');
    setError('');
  };

  const save = async () => {
    const validationError = validateProfileSetupWizardDraft(draft, { scenario });
    if (validationError) {
      setError(tProfileError(validationError));
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
        scenario: scenario ?? undefined,
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
    saveConditionHistoryFromOnboarding(id, conditions, conditionHistoryDrafts, comorbidityLinks);
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

  const goNext = () => {
    const validationError = validateProfileSetupWizardStep(currentStep, draft, { scenario });
    if (validationError) {
      setError(tProfileError(validationError));
      return;
    }

    setError('');
    const next = getNextProfileSetupWizardStep(currentStep, wizardNav);
    if (next) {
      setCurrentStep(next);
      return;
    }

    void save();
  };

  const goBack = () => {
    setError('');
    const previous = getPreviousProfileSetupWizardStep(currentStep, wizardNav);
    if (previous) setCurrentStep(previous);
  };

  const isLastStep = currentStep === 'contacts';
  const showBack = stepIndex > 0;

  const primaryLabel = isLastStep
    ? scenario === 'both' && wizardStep === 'self'
      ? t('profileSetup.nextChild')
      : t('profileSetup.saveProfile')
    : t('profileSetup.next');

  return (
    <Screen>
      <View style={styles.header}>
        <ScreenEyebrow section={t('profileSetup.eyebrow')} />
        <Text style={ui.docTitle}>{title}</Text>
        <Text style={ui.docMeta}>{subtitle}</Text>
      </View>

      {currentStep === 'name' ? (
        <ProfileSetupNameStep
          name={name}
          onNameChange={setName}
          profileType={type}
          onProfileTypeChange={setType}
          canToggleType={canToggleType}
          lockedType={lockedType}
        />
      ) : null}

      {currentStep === 'birthYear' ? (
        <ProfileSetupBirthYearStep
          birthYear={birthYear}
          onBirthYearChange={setBirthYear}
          showChildConsent={needsChildConsent(effectiveType, scenario ?? undefined)}
          childConsent={childConsent}
          onChildConsentChange={setChildConsent}
        />
      ) : null}

      {currentStep === 'conditions' ? (
        <ProfileSetupConditionsStep
          selected={conditions}
          onChange={handleConditionsChange}
          profileType={effectiveType}
        />
      ) : null}

      {currentStep === 'conditionHistory' ? (
        <ProfileSetupConditionHistoryStep
          conditions={conditions}
          drafts={conditionHistoryDrafts}
          onChange={setConditionHistoryDrafts}
        />
      ) : null}

      {currentStep === 'comorbidity' ? (
        <ProfileSetupComorbidityStep
          conditions={conditions}
          links={comorbidityLinks}
          onChange={setComorbidityLinks}
        />
      ) : null}

      {currentStep === 'allergens' ? (
        <ProfileSetupAllergensStep
          selected={selected}
          onSelectedChange={setSelected}
          confirmations={confirmations}
          onConfirmationsChange={setConfirmations}
        />
      ) : null}

      {currentStep === 'phenotypeSummary' ? (
        <ProfileSetupPhenotypeStep
          conditions={conditions}
          conditionHistoryDrafts={conditionHistoryDrafts}
          comorbidityLinks={comorbidityLinks}
          allergenIds={selected}
          profileType={effectiveType}
          birthYear={birthYear}
        />
      ) : null}

      {currentStep === 'contacts' ? (
        <ProfileSetupContactsStep contacts={contacts} onChange={setContacts} />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        {showBack ? (
          <Button
            testID="profile-wizard-back"
            label={t('profileSetup.back')}
            variant="secondary"
            onPress={goBack}
            style={styles.backButton}
          />
        ) : null}
        <Button
          testID={isLastStep ? 'profile-save' : 'profile-wizard-next'}
          label={primaryLabel}
          variant="primary"
          block={!showBack}
          onPress={goNext}
          style={showBack ? styles.nextButton : undefined}
        />
      </View>

      <Disclaimer>{t('profileSetup.disclaimer')}</Disclaimer>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    header: { gap: 2, marginBottom: 4 },
    actions: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'stretch',
    },
    backButton: { flex: 1 },
    nextButton: { flex: 2 },
    error: {
      fontFamily: fonts.sans,
      color: colors.danger,
      fontSize: 14,
      textAlign: 'center',
    },
  });
}
