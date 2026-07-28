import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  allergenIdsFromConditionOptions,
  createEmptySymptomBaseline,
  getMissingConditionsForAllergens,
  getWizardStep,
  getGatedConditionRemovals,
  isSymptomBaselineEmpty,
  mergePreSeededAllergens,
  needsChildConsent,
  normalizeAllergyConfirmations,
  reconcileConditionOptionSelections,
  shouldCompleteOnboarding,
  type AllergyConditionId,
  type AllergyConfirmationSource,
  type ComorbidityLink,
  type ConditionOptionSelections,
  type ProfileSymptomBaseline,
  type ProfileType,
} from '@allerguide/core';
import { createProfile, listProfiles, ProfileValidationError } from '@/src/services/profile-service';
import { setStoredProfileConditions } from '@/src/services/profile-conditions-service';
import { setStoredSymptomBaseline } from '@/src/services/profile-symptom-baseline-service';
import { saveConditionHistoryFromOnboarding } from '@/src/services/condition-history-service';
import {
  normalizeEmergencyContactDrafts,
  syncEmergencyContacts,
  type EmergencyContactDraft,
} from '@/src/services/emergency-contact-service';
import { getStoredScenario, markOnboardingComplete } from '@/src/services/settings-service';
import { reconcileAllReminders } from '@/src/services/reminder-reconcile-service';
import { trackEvent } from '@/src/services/analytics-service';
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
import { ProfileSetupCrossReactionsStep } from '@/src/components/profile-setup/ProfileSetupCrossReactionsStep';
import { ProfileSetupSymptomsStep } from '@/src/components/profile-setup/ProfileSetupSymptomsStep';
import { ProfileSetupConditionHistoryStep } from '@/src/components/profile-setup/ProfileSetupConditionHistoryStep';
import type { ConditionHistoryDrafts } from '@/src/components/ConditionHistoryEditor';
import {
  getNextProfileSetupWizardStep,
  getPreviousProfileSetupWizardStep,
  getVisibleProfileSetupStepProgress,
  buildProfileSetupWizardNavOptions,
  reconcileComorbidityLinks,
  reconcileConditionHistoryDrafts,
  validateProfileSetupWizardDraft,
  validateProfileSetupWizardStep,
  type ProfileSetupWizardStep,
} from '@/src/hooks/use-profile-setup-wizard';
import { ProfileSetupAllergenConfirmationsStep } from '@/src/components/profile-setup/ProfileSetupAllergenConfirmationsStep';
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
  const [conditionOptionSelections, setConditionOptionSelections] =
    useState<ConditionOptionSelections>({});
  const optionSeedRef = useRef<string[]>([]);
  const [symptomBaseline, setSymptomBaseline] = useState<ProfileSymptomBaseline>(() =>
    createEmptySymptomBaseline(),
  );
  const [conditionHistoryDrafts, setConditionHistoryDrafts] = useState<ConditionHistoryDrafts>({});
  const [comorbidityLinks, setComorbidityLinks] = useState<ComorbidityLink[]>([]);
  const [contacts, setContacts] = useState<EmergencyContactDraft[]>([]);
  const [crossPendingIds, setCrossPendingIds] = useState<string[]>([]);
  const [crossReactionAllergenIds, setCrossReactionAllergenIds] = useState<string[]>([]);
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

  const draft = useMemo(
    () => ({
      name,
      birthYear,
      selectedAllergenIds: selected,
      crossReactionAllergenIds,
      confirmations,
      conditions,
      conditionOptionSelections,
      symptomBaseline,
      conditionHistoryDrafts,
      comorbidityLinks,
      contacts,
      childConsent,
      profileType: effectiveType,
    }),
    [
      name,
      birthYear,
      selected,
      crossReactionAllergenIds,
      confirmations,
      conditions,
      conditionOptionSelections,
      symptomBaseline,
      conditionHistoryDrafts,
      comorbidityLinks,
      contacts,
      childConsent,
      effectiveType,
    ],
  );

  const wizardNav = buildProfileSetupWizardNavOptions(draft);
  const stepProgressMeta = getVisibleProfileSetupStepProgress(currentStep, draft);
  const stepProgress = t('profileSetup.stepProgress', {
    current: stepProgressMeta.current,
    total: stepProgressMeta.total,
  });

  const subtitle =
    scenario === 'both' && wizardStep === 'child'
      ? t('profileSetup.subtitleChildStep', { step: stepProgress })
      : scenario === 'both'
        ? t('profileSetup.subtitleSelfStep', { step: stepProgress })
        : currentStep === 'phenotypeSummary'
          ? stepProgress
          : t('profileSetup.subtitleDefault', { step: stepProgress });

  const suggestedConditions = useMemo(
    () => getMissingConditionsForAllergens(selected, conditions),
    [selected, conditions],
  );

  useEffect(() => {
    trackEvent('profile_setup_step_view', { step: currentStep });
  }, [currentStep]);

  const applyOptionPreSeed = (nextSelections: ConditionOptionSelections) => {
    const nextSeed = allergenIdsFromConditionOptions(nextSelections);
    setSelected((prev) => {
      const merged = mergePreSeededAllergens(prev, optionSeedRef.current, nextSeed);
      setConfirmations((conf) => normalizeAllergyConfirmations(merged, conf));
      return merged;
    });
    optionSeedRef.current = nextSeed;
    setConditionOptionSelections(nextSelections);
  };

  const applyConditionsChange = (next: AllergyConditionId[]) => {
    setConditions(next);
    setConditionHistoryDrafts((prev) => reconcileConditionHistoryDrafts(next, prev));
    setComorbidityLinks((prev) => reconcileComorbidityLinks(next, prev));
    const nextOptions = reconcileConditionOptionSelections(next, conditionOptionSelections);
    applyOptionPreSeed(nextOptions);
  };

  const handleConditionsChange = (next: AllergyConditionId[]) => {
    const gatedRemoved = getGatedConditionRemovals(conditions, next);
    if (gatedRemoved.length > 0) {
      Alert.alert(
        t('profileSetup.conditionRemoveTitle'),
        t('profileSetup.conditionRemoveMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.save'), onPress: () => applyConditionsChange(next) },
        ],
      );
      return;
    }
    applyConditionsChange(next);
  };

  const resetForm = () => {
    setName('');
    setBirthYear('');
    setSelected([]);
    setCrossReactionAllergenIds([]);
    setConditions([]);
    setConditionOptionSelections({});
    optionSeedRef.current = [];
    setSymptomBaseline(createEmptySymptomBaseline());
    setConditionHistoryDrafts({});
    setComorbidityLinks([]);
    setContacts([]);
    setConfirmations({});
    setCrossPendingIds([]);
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
        crossReactionAllergies: crossReactionAllergenIds,
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
    setStoredSymptomBaseline(id, isSymptomBaselineEmpty(symptomBaseline) ? null : symptomBaseline);
    saveConditionHistoryFromOnboarding(id, conditions, conditionHistoryDrafts, comorbidityLinks);
    syncEmergencyContacts(id, normalizeEmergencyContactDrafts(contacts));

    setActiveProfileId(id);
    const profiles = listProfiles();
    void reconcileAllReminders();

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

    const nextSelected = selected;
    if (currentStep === 'crossReactions') {
      if (crossPendingIds.length > 0) {
        setCrossReactionAllergenIds(crossPendingIds);
        trackEvent('profile_setup_step_complete', {
          step: 'crossReactions',
          added: crossPendingIds.length,
        });
      } else {
        setCrossReactionAllergenIds([]);
        trackEvent('profile_setup_step_skip', { step: 'crossReactions' });
      }
      setCrossPendingIds([]);
    } else if (currentStep === 'symptomBaseline') {
      if (isSymptomBaselineEmpty(symptomBaseline)) {
        trackEvent('profile_setup_step_skip', { step: 'symptomBaseline' });
      } else {
        trackEvent('profile_setup_step_complete', { step: 'symptomBaseline' });
      }
    } else {
      trackEvent('profile_setup_step_complete', { step: currentStep });
    }

    const nextNav = buildProfileSetupWizardNavOptions({
      conditions,
      selectedAllergenIds: nextSelected,
    });
    const next = getNextProfileSetupWizardStep(currentStep, nextNav);
    if (next) {
      if (next === 'crossReactions') setCrossPendingIds([]);
      setCurrentStep(next);
      return;
    }

    void save();
  };

  const goBack = () => {
    setError('');
    const previous = getPreviousProfileSetupWizardStep(currentStep, wizardNav);
    if (previous) {
      if (currentStep === 'crossReactions') setCrossPendingIds([]);
      setCurrentStep(previous);
    }
  };

  const isLastStep = currentStep === 'contacts';
  const showBack = stepProgressMeta.current > 1;

  const primaryLabel = isLastStep
    ? scenario === 'both' && wizardStep === 'self'
      ? t('profileSetup.nextChild')
      : t('profileSetup.saveProfile')
    : currentStep === 'crossReactions' && crossPendingIds.length > 0
      ? t('profileSetup.crossReactions.addNext')
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
          optionSelections={conditionOptionSelections}
          onOptionSelectionsChange={applyOptionPreSeed}
          profileType={effectiveType}
        />
      ) : null}

      {currentStep === 'allergens' ? (
        <ProfileSetupAllergensStep
          selected={selected}
          onSelectedChange={(ids) => {
            setSelected(ids);
            setCrossPendingIds([]);
          }}
          confirmations={confirmations}
          onConfirmationsChange={setConfirmations}
          suggestedConditionIds={suggestedConditions}
          onAddSuggestedCondition={(conditionId) =>
            applyConditionsChange(
              conditions.includes(conditionId) ? conditions : [...conditions, conditionId],
            )
          }
        />
      ) : null}

      {currentStep === 'crossReactions' ? (
        <ProfileSetupCrossReactionsStep
          selectedAllergenIds={selected}
          pendingIds={crossPendingIds}
          onPendingChange={setCrossPendingIds}
        />
      ) : null}

      {currentStep === 'allergenConfirmations' ? (
        <ProfileSetupAllergenConfirmationsStep
          selectedAllergenIds={selected}
          confirmations={confirmations}
          onConfirmationsChange={setConfirmations}
        />
      ) : null}

      {currentStep === 'symptomBaseline' ? (
        <ProfileSetupSymptomsStep
          conditions={conditions}
          baseline={symptomBaseline}
          onChange={setSymptomBaseline}
        />
      ) : null}

      {currentStep === 'conditionHistory' ? (
        <ProfileSetupConditionHistoryStep
          conditions={conditions}
          drafts={conditionHistoryDrafts}
          onChange={setConditionHistoryDrafts}
          birthYear={birthYear}
        />
      ) : null}

      {currentStep === 'comorbidity' ? (
        <ProfileSetupComorbidityStep
          conditions={conditions}
          links={comorbidityLinks}
          onChange={setComorbidityLinks}
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
