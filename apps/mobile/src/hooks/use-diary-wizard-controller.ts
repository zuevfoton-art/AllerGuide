import { useEffect, useMemo, useRef, useState } from 'react';
import {
  applyDishBreakdownToAnswers,
  applyMedicineCardToSectionAnswers,
  attachDiaryAutoMetadata,
  buildIntoleranceAlert,
  buildMedicineCardFromDiaryAnswers,
  diaryMedicineNameStepId,
  encodeDiaryDetails,
  enrichScaleAnswers,
  findDishRecipe,
  getDiaryPhotoUrisFromAnswers,
  getDiaryStepAnswers,
  groupDiaryStepsIntoScreens,
  hasSectionAnswers,
  mergeMedicinePrefillFromCard,
  parseSelectedComponentIds,
  pickMedicineSuggestionForTypedName,
  resolveSelectedIdsForEnrichment,
  serializeSelectedComponentIds,
  toMedicineCard,
  validateClinicalScale,
  validateDiarySection,
  validateDiarySectionStep,
  type DiaryAutoMetadata,
  type DiarySection,
  type DishSuggestion,
  type MedicineCard,
} from '@allerguide/core';
import {
  diaryPefZonePreview,
  diaryScalePreview,
} from '@/src/components/diary/wizard/diary-wizard-preview';
import { useDishSuggestions } from '@/src/hooks/use-dish-suggestions';
import { useMedicineSuggestions } from '@/src/hooks/use-medicine-suggestions';
import { localizeDiarySections } from '@/src/i18n/content';
import { recognizeDiaryDish } from '@/src/services/diary-dish-recognition-service';
import {
  rankLocalMedicineSuggestions,
  rememberMedicineCard,
} from '@/src/services/medicine-suggest-service';
import { useTranslation } from '@/src/store/locale-store';

export interface DiaryWizardResult {
  type: string;
  details: string;
  photoUris?: string[];
}

export interface UseDiaryWizardControllerParams {
  sections?: DiarySection[];
  initialAnswersBySection?: Record<string, Record<string, string>>;
  onComplete: (entries: DiaryWizardResult[]) => void;
  allowSkipSection?: boolean;
  drugIntolerances?: string[];
  ageYears?: number | null;
  profileId?: number | null;
  localMedicineCards?: MedicineCard[];
  planPersonalBestPef?: number | null;
  profileAllergiesJson?: string;
  autoMetadata?: DiaryAutoMetadata;
  initialStepId?: string;
}

export function useDiaryWizardController({
  sections: sectionsProp,
  initialAnswersBySection,
  onComplete,
  allowSkipSection = true,
  drugIntolerances,
  ageYears = null,
  profileId = null,
  localMedicineCards = [],
  planPersonalBestPef,
  profileAllergiesJson = '[]',
  autoMetadata,
  initialStepId,
}: UseDiaryWizardControllerParams) {
  const { t, tDiaryError, locale, content } = useTranslation();
  const sections = useMemo(
    () => sectionsProp ?? localizeDiarySections(locale, content()),
    [sectionsProp, locale, content],
  );
  /** Wizard screens per section: grouped steps are asked together. */
  const screensBySection = useMemo(
    () => sections.map((item) => groupDiaryStepsIntoScreens(item.steps)),
    [sections],
  );
  const [sectionIndex, setSectionIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(() => {
    if (!initialStepId) return 0;
    const first = (sectionsProp ?? [])[0];
    if (!first) return 0;
    const index = groupDiaryStepsIntoScreens(first.steps).findIndex((screen) =>
      screen.some((item) => item.id === initialStepId),
    );
    return index >= 0 ? index : 0;
  });
  const [answersBySection, setAnswersBySection] = useState<Record<string, Record<string, string>>>(
    initialAnswersBySection ?? {},
  );
  const [error, setError] = useState('');
  const [offEnriching, setOffEnriching] = useState(false);
  const foodComponentsTouchedRef = useRef(false);

  const section = sections[sectionIndex];
  const screens = screensBySection[sectionIndex] ?? [[]];
  const screenSteps = screens[stepIndex] ?? screens[0] ?? [];
  const sectionAnswers = answersBySection[section.type] ?? {};
  const totalSections = sections.length;
  const totalStepsInSection = screens.length;
  const overallStepNumber =
    screensBySection.slice(0, sectionIndex).reduce((sum, item) => sum + item.length, 0) +
    stepIndex +
    1;
  const overallStepsTotal = screensBySection.reduce((sum, item) => sum + item.length, 0);
  const isLastStep = sectionIndex === totalSections - 1 && stepIndex === totalStepsInSection - 1;
  const screenHasStep = (id: string) => screenSteps.some((item) => item.id === id);
  const hasLocalDishPreview = Boolean(
    sectionAnswers.foodDishName && sectionAnswers.foodComponentsDef,
  );
  const waitingForDishRecognition =
    section.type === 'Питание' && screenHasStep('food') && offEnriching && !hasLocalDishPreview;
  const canAdvanceCurrentStep =
    !waitingForDishRecognition &&
    (section.type === 'Шкала'
      ? !validateClinicalScale(sectionAnswers)
      : screenSteps.every(
          (item) => !item.required || Boolean(sectionAnswers[item.id]?.trim()),
        ));
  const canSkipSection =
    allowSkipSection &&
    totalSections > 1 &&
    (screenSteps.every((item) => !item.required) ||
      getDiaryStepAnswers(section, sectionAnswers).length > 0);

  const nutritionFood = section.type === 'Питание' ? (sectionAnswers.food ?? '').trim() : '';
  const medicineNameStepId = diaryMedicineNameStepId(section.type);
  const isMedicineNameStep = Boolean(medicineNameStepId && screenHasStep(medicineNameStepId));
  const medicineName = medicineNameStepId ? (sectionAnswers[medicineNameStepId] ?? '').trim() : '';
  const { suggestions: medicineSuggestions, searching: medicineSearching } = useMedicineSuggestions(
    medicineName,
    { enabled: isMedicineNameStep, profileId, localCards: localMedicineCards },
  );
  const isFoodStep = section.type === 'Питание' && screenHasStep('food');
  const { suggestions: dishSuggestions, searching: dishSearching } = useDishSuggestions(
    nutritionFood,
    { enabled: isFoodStep },
  );

  useEffect(() => {
    if (section.type !== 'Питание') return;
    const food = nutritionFood;
    if (food.length < 2) {
      setOffEnriching(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      // Catalog match is already applied synchronously — do not block Next on OFF.
      if (!findDishRecipe(food)) setOffEnriching(true);
      void recognizeDiaryDish(food)
        .then((enrichment) => {
          if (cancelled || !enrichment) return;
          // Local-only result is already applied synchronously on food change.
          if (enrichment.source === 'local') return;

          setAnswersBySection((prev) => {
            const current = { ...(prev['Питание'] ?? {}) };
            if ((current.food ?? '').trim() !== food) return prev;

            let nextAnswers = { ...current };
            if (foodComponentsTouchedRef.current && enrichment.previousAvailableIds) {
              const merged = resolveSelectedIdsForEnrichment(
                parseSelectedComponentIds(current.foodComponents),
                enrichment.previousAvailableIds,
                enrichment.components,
              );
              if (merged) {
                nextAnswers.foodComponents = serializeSelectedComponentIds(merged);
              }
            } else if (!foodComponentsTouchedRef.current) {
              delete nextAnswers.foodComponents;
            }

            return {
              ...prev,
              Питание: applyDishBreakdownToAnswers(nextAnswers, profileAllergiesJson, {
                components: enrichment.components,
                dishId: enrichment.dishId,
                dishName: enrichment.dishName,
                source: enrichment.source,
                productBarcode: enrichment.productBarcode,
                productName: enrichment.productName,
              }),
            };
          });
        })
        .finally(() => {
          if (!cancelled) setOffEnriching(false);
        });
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [nutritionFood, profileAllergiesJson, section.type]);

  const scalePreview = diaryScalePreview(section.type, isLastStep, sectionAnswers);
  const pefZonePreview = diaryPefZonePreview(section.type, sectionAnswers, planPersonalBestPef);

  const setAnswer = (stepId: string, value: string) => {
    setAnswersBySection((prev) => {
      let nextSectionAnswers = {
        ...(prev[section.type] ?? {}),
        [stepId]: value,
      };
      if (stepId === 'medicine' && section.type === 'Лекарство' && drugIntolerances?.length) {
        const alert = buildIntoleranceAlert(value, drugIntolerances, [
          nextSectionAnswers.medicineActiveSubstance ?? '',
        ]);
        if (alert) nextSectionAnswers.intoleranceAlert = alert;
        else delete nextSectionAnswers.intoleranceAlert;
      }
      if (stepId === 'food' && section.type === 'Питание') {
        // Reset selection so a new dish gets a fresh full checklist.
        foodComponentsTouchedRef.current = false;
        delete nextSectionAnswers.foodComponents;
        delete nextSectionAnswers.foodComponentsDef;
        delete nextSectionAnswers.foodDishId;
        delete nextSectionAnswers.foodDishName;
        delete nextSectionAnswers.foodOffSource;
        delete nextSectionAnswers.foodOffBarcode;
        delete nextSectionAnswers.foodOffName;
        delete nextSectionAnswers.foodComponentConflicts;
        nextSectionAnswers = applyDishBreakdownToAnswers(nextSectionAnswers, profileAllergiesJson, {
          source: 'local',
        });
      }
      return {
        ...prev,
        [section.type]: nextSectionAnswers,
      };
    });
  };

  const applyMedicineCard = (card: MedicineCard, mode: 'replace' | 'fillEmpty') => {
    setAnswersBySection((prev) => ({
      ...prev,
      [section.type]:
        section.type === 'Лекарство'
          ? mergeMedicinePrefillFromCard(
              prev[section.type] ?? {},
              card,
              ageYears,
              drugIntolerances ?? [],
              mode,
            )
          : applyMedicineCardToSectionAnswers(
              section.type,
              prev[section.type] ?? {},
              card,
              ageYears,
              drugIntolerances ?? [],
            ),
    }));
    void rememberMedicineCard(card);
  };

  const selectMedicineSuggestion = (card: MedicineCard) => {
    applyMedicineCard(card, 'replace');
  };

  const selectDishSuggestion = (suggestion: DishSuggestion) => {
    setAnswer('food', suggestion.name);
  };

  const setFoodComponentSelection = (selectedIds: string[]) => {
    foodComponentsTouchedRef.current = true;
    setAnswersBySection((prev) => {
      const current = { ...(prev['Питание'] ?? {}) };
      current.foodComponents = serializeSelectedComponentIds(selectedIds);
      const next = applyDishBreakdownToAnswers(current, profileAllergiesJson);
      return { ...prev, Питание: next };
    });
  };

  const finishWizard = () => {
    let sectionError: string | null = null;
    const entries = sections.flatMap((item) => {
      const answers = answersBySection[item.type] ?? {};
      if (!hasSectionAnswers(item, answers)) return [];

      if (item.type === 'Шкала') {
        const validationError = validateClinicalScale(answers);
        if (validationError) {
          sectionError ??= validationError;
          return [];
        }
        const enriched = enrichScaleAnswers(answers);
        return [{ type: item.type, details: encodeDiaryDetails(enriched, item.type) }];
      }

      const validationError = validateDiarySection(item, answers);
      if (validationError) {
        sectionError ??= validationError;
        return [];
      }

      const photoUris = getDiaryPhotoUrisFromAnswers(answers);
      const withAuto = attachDiaryAutoMetadata(answers, autoMetadata ?? {});
      return [
        {
          type: item.type,
          details: encodeDiaryDetails(withAuto, item.type),
          photoUris: photoUris.length ? photoUris : undefined,
        },
      ];
    });

    if (sectionError) {
      setError(tDiaryError(sectionError));
      return;
    }

    if (entries.length === 0) {
      setError(t('diaryWizard.fillOneSection'));
      return;
    }

    onComplete(entries);
  };

  const advanceAfterValidation = () => {
    setError('');
    if (stepIndex < totalStepsInSection - 1) {
      setStepIndex((value) => value + 1);
      return;
    }

    if (sectionIndex < totalSections - 1) {
      setSectionIndex((value) => value + 1);
      setStepIndex(0);
      return;
    }

    finishWizard();
  };

  const goNext = () => {
    const validationError =
      section.type === 'Шкала' && isLastStep
        ? validateClinicalScale(sectionAnswers)
        : screenSteps.reduce<string | null>(
            (found, item) =>
              found ??
              validateDiarySectionStep(
                section,
                section.steps.findIndex((candidate) => candidate.id === item.id),
                sectionAnswers,
              ),
            null,
          );
    if (validationError) {
      setError(tDiaryError(validationError));
      return;
    }

    if (isMedicineNameStep && medicineNameStepId) {
      const typedName = sectionAnswers[medicineNameStepId] ?? '';
      const localHit =
        pickMedicineSuggestionForTypedName(typedName, medicineSuggestions) ??
        pickMedicineSuggestionForTypedName(
          typedName,
          rankLocalMedicineSuggestions(typedName, localMedicineCards),
        );
      if (localHit) {
        applyMedicineCard(localHit, 'fillEmpty');
      } else {
        const stub =
          section.type === 'Лекарство'
            ? buildMedicineCardFromDiaryAnswers(sectionAnswers)
            : toMedicineCard({ name: typedName }, 'manual');
        if (stub?.name.trim()) void rememberMedicineCard(stub);
      }
      advanceAfterValidation();
      return;
    }

    advanceAfterValidation();
  };

  const goBack = () => {
    setError('');
    if (stepIndex > 0) {
      setStepIndex((value) => value - 1);
      return;
    }
    if (sectionIndex > 0) {
      const previousScreens = screensBySection[sectionIndex - 1] ?? [];
      setSectionIndex((value) => value - 1);
      setStepIndex(Math.max(0, previousScreens.length - 1));
    }
  };

  const skipSection = () => {
    if (hasSectionAnswers(section, sectionAnswers)) {
      const validationError =
        section.type === 'Шкала'
          ? validateClinicalScale(sectionAnswers)
          : validateDiarySection(section, sectionAnswers);
      if (validationError) {
        setError(tDiaryError(validationError));
        return;
      }
    }

    setError('');
    if (sectionIndex < totalSections - 1) {
      setSectionIndex((value) => value + 1);
      setStepIndex(0);
      return;
    }
    finishWizard();
  };

  return {
    section,
    screens: screenSteps,
    answers: sectionAnswers,
    previews: { scalePreview, pefZonePreview },
    suggestions: {
      medicineSuggestions,
      medicineSearching,
      dishSuggestions,
      dishSearching,
    },
    setters: {
      setAnswer,
      setFoodComponentSelection,
      selectMedicineSuggestion,
      selectDishSuggestion,
    },
    goNext,
    goBack,
    skipSection,
    flags: {
      isLastStep,
      canAdvanceCurrentStep,
      canSkipSection,
      hasLocalDishPreview,
      offEnriching,
      medicineNameStepId,
      overallStepNumber,
      overallStepsTotal,
      sectionIndex,
      stepIndex,
    },
    error,
    profileAllergiesJson,
  };
}
