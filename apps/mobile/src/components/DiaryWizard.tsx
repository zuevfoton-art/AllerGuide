import { useMemo, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  parseDishComponentDefs,
  type DiaryAutoMetadata,
  type DiarySection,
  type MedicineCard,
} from '@allerguide/core';
import { DiaryDishComponentsField } from '@/src/components/diary/wizard/DiaryDishComponentsField';
import { DiaryLegacyEditor } from '@/src/components/diary/wizard/DiaryLegacyEditor';
import { DiaryPefZonePreview } from '@/src/components/diary/wizard/DiaryPefZonePreview';
import { DiaryStepField } from '@/src/components/diary/wizard/DiaryStepField';
import { createStyles } from '@/src/components/diary/wizard/diary-wizard-styles';
import { DishNameField } from '@/src/components/DishNameField';
import { MedicineNameField } from '@/src/components/MedicineNameField';
import {
  useDiaryWizardController,
  type DiaryWizardResult,
} from '@/src/hooks/use-diary-wizard-controller';
import { useTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

export type { DiaryWizardResult };
export { DiaryLegacyEditor };

interface DiaryWizardProps {
  sections?: DiarySection[];
  initialAnswersBySection?: Record<string, Record<string, string>>;
  onCancel: () => void;
  onComplete: (entries: DiaryWizardResult[]) => void;
  onDelete?: () => void;
  submitLabel?: string;
  allowSkipSection?: boolean;
  drugIntolerances?: string[];
  /** Active profile age for catalog dose bands. */
  ageYears?: number | null;
  /** Used to rank previously saved medicines from this profile's diary. */
  profileId?: number | null;
  /** Cards already loaded on the diary screen — shown instantly while YC search runs. */
  localMedicineCards?: MedicineCard[];
  planPersonalBestPef?: number | null;
  /** JSON allergies from active profile — used for dish component conflict warnings. */
  profileAllergiesJson?: string;
  /** Hidden pollen/scan/meds metadata merged on save. */
  autoMetadata?: DiaryAutoMetadata;
  /** Optional recognized-medicine summary / age warning above the steps. */
  notice?: ReactNode;
  /** Start on this step id when present in the first section. */
  initialStepId?: string;
}

export function DiaryWizard({
  sections: sectionsProp,
  initialAnswersBySection,
  onCancel: _onCancel,
  onComplete,
  onDelete,
  submitLabel,
  allowSkipSection = true,
  drugIntolerances,
  ageYears = null,
  profileId = null,
  localMedicineCards = [],
  planPersonalBestPef,
  profileAllergiesJson = '[]',
  autoMetadata,
  notice,
  initialStepId,
}: DiaryWizardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const {
    section,
    screens,
    answers,
    previews: { scalePreview, pefZonePreview },
    suggestions: { medicineSuggestions, medicineSearching, dishSuggestions, dishSearching },
    setters: { setAnswer, setFoodComponentSelection, selectMedicineSuggestion, selectDishSuggestion },
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
  } = useDiaryWizardController({
    sections: sectionsProp,
    initialAnswersBySection,
    onComplete,
    allowSkipSection,
    drugIntolerances,
    ageYears,
    profileId,
    localMedicineCards,
    planPersonalBestPef,
    profileAllergiesJson,
    autoMetadata,
    initialStepId,
  });

  return (
    <View style={styles.wrap}>
      <View testID="diary-wizard-step-label" collapsable={false}>
        <Text style={styles.progressText}>{section.title}</Text>
      </View>

      {/* The bar is the only progress indicator; the count stays for screen readers. */}
      <View
        style={styles.progressTrack}
        accessibilityRole="progressbar"
        accessibilityLabel={t('diaryWizard.stepOf', {
          current: overallStepNumber,
          total: overallStepsTotal,
        })}>
        <View
          style={[styles.progressFill, { width: `${(overallStepNumber / overallStepsTotal) * 100}%` }]}
        />
      </View>

      {notice ? <View style={styles.notice}>{notice}</View> : null}

      {screens.map((current) => (
        <View key={current.id} style={styles.fieldBlock}>
          <Text style={styles.stepLabel}>{current.label}</Text>
          {current.hint ? <Text style={styles.stepHint}>{current.hint}</Text> : null}

          {current.field === 'checklist' && current.id === 'foodComponents' ? (
            <DiaryDishComponentsField
              foodText={answers.food ?? ''}
              selectedRaw={answers.foodComponents ?? ''}
              componentsDefRaw={answers.foodComponentsDef ?? ''}
              dishId={answers.foodDishId ?? ''}
              dishName={answers.foodDishName ?? ''}
              conflictsSummary={answers.foodComponentConflicts ?? ''}
              profileAllergiesJson={profileAllergiesJson}
              offEnriching={offEnriching}
              offSource={answers.foodOffSource ?? ''}
              offProductName={answers.foodOffName ?? ''}
              onChangeSelection={setFoodComponentSelection}
            />
          ) : medicineNameStepId && current.id === medicineNameStepId ? (
            <MedicineNameField
              value={answers[medicineNameStepId] ?? ''}
              placeholder={current.placeholder}
              label={current.label}
              inputTestID={`diary-field-${current.id}`}
              suggestions={medicineSuggestions}
              loading={medicineSearching}
              onChange={(value) => setAnswer(medicineNameStepId, value)}
              onSelect={selectMedicineSuggestion}
            />
          ) : section.type === 'Питание' && current.id === 'food' ? (
            <>
              <DishNameField
                value={answers.food ?? ''}
                placeholder={current.placeholder}
                label={current.label}
                inputTestID={`diary-field-${current.id}`}
                suggestions={dishSuggestions}
                loading={dishSearching && !hasLocalDishPreview}
                onChange={(value) => setAnswer('food', value)}
                onSelect={selectDishSuggestion}
              />
              {answers.foodDishName && answers.foodComponentsDef ? (
                <Text style={styles.hint} testID="diary-dish-preview">
                  {t('diaryWizard.dishPreviewTitle')}:{' '}
                  {parseDishComponentDefs(answers.foodComponentsDef)
                    .map((component) => component.nameRu)
                    .join(', ')}
                </Text>
              ) : null}
              {offEnriching && !hasLocalDishPreview ? (
                <View style={styles.offLoadingRow} testID="diary-dish-recognizing">
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                  <Text style={styles.hint}>{t('diaryWizard.dishOffLoading')}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <DiaryStepField
              step={current}
              value={answers[current.id] ?? ''}
              onChange={(value) => setAnswer(current.id, value)}
            />
          )}
        </View>
      ))}

      {scalePreview ? (
        <Text style={styles.scalePreview}>
          {t('diaryWizard.scalePreview', {
            score: scalePreview.total,
            interpretation: scalePreview.interpretation,
          })}
        </Text>
      ) : null}

      {pefZonePreview ? (
        <DiaryPefZonePreview zone={pefZonePreview.zone} percent={pefZonePreview.percent} />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        {sectionIndex === 0 && stepIndex === 0 ? null : (
          <Pressable style={styles.secondaryBtn} onPress={goBack}>
            <Text style={styles.secondaryText}>{t('common.back')}</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.primaryBtn, !canAdvanceCurrentStep && styles.btnDisabled]}
          disabled={!canAdvanceCurrentStep}
          onPress={goNext}
          testID="diary-wizard-primary">
          <Text style={styles.primaryText}>
            {isLastStep ? (submitLabel ?? t('common.save')) : t('common.next')}
          </Text>
        </Pressable>
      </View>

      {canSkipSection ? (
        <Pressable style={styles.skipBtn} onPress={skipSection}>
          <Text style={styles.skipText}>{t('diaryWizard.skipSection')}</Text>
        </Pressable>
      ) : null}

      {onDelete ? (
        <Pressable style={styles.deleteBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
          <Text style={styles.deleteText}>{t('diaryWizard.deleteEntry')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
