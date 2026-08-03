import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  applyDishBreakdownToAnswers,
  buildDishBreakdown,
  buildIntoleranceAlert,
  computePefPercentOfBest,
  computePefZone,
  computeScaleScore,
  encodeDiaryDetails,
  enrichScaleAnswers,
  getDiaryPhotoUrisFromAnswers,
  getDiaryStepAnswers,
  getScaleIdFromAnswers,
  hasSectionAnswers,
  parseDiaryPhotoUris,
  parseMultiChoiceValue,
  parsePefNumeric,
  parseSelectedComponentIds,
  parseDishComponentDefs,
  parseVoiceDiaryUtterance,
  applyVoiceParseToAnswers,
  resolvePersonalBestPef,
  resolveSelectedIdsForEnrichment,
  serializeSelectedComponentIds,
  toggleMultiChoiceValue,
  validateClinicalScale,
  validateDiarySectionStep,
  type DiarySection,
  type DiaryStep,
  type PefZone,
} from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { WEB_INPUT_FONT_SIZE } from '@/src/constants/layout';
import { useTranslation } from '@/src/store/locale-store';
import { localizeDiarySections } from '@/src/i18n/content';
import {
  addPhotoUri,
  canAddMorePhotos,
  captureDiaryPhoto,
  pickDiaryPhotoFromLibrary,
  removePhotoUri,
} from '@/src/services/diary-photo-picker';
import { enrichDishFromOpenFoods } from '@/src/services/dish-off-enrichment-service';
import { VoiceNoteButton } from '@/src/components/VoiceNoteButton';

export interface DiaryWizardResult {
  type: string;
  details: string;
  photoUris?: string[];
}

interface DiaryWizardProps {
  sections?: DiarySection[];
  initialAnswersBySection?: Record<string, Record<string, string>>;
  onCancel: () => void;
  onComplete: (entries: DiaryWizardResult[]) => void;
  onDelete?: () => void;
  submitLabel?: string;
  allowSkipSection?: boolean;
  drugIntolerances?: string[];
  planPersonalBestPef?: number | null;
  /** JSON allergies from active profile — used for dish component conflict warnings. */
  profileAllergiesJson?: string;
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
  planPersonalBestPef,
  profileAllergiesJson = '[]',
}: DiaryWizardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, tDiaryError, locale, content } = useTranslation();
  const sections = useMemo(
    () => sectionsProp ?? localizeDiarySections(locale, content()),
    [sectionsProp, locale, content],
  );
  const [sectionIndex, setSectionIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [answersBySection, setAnswersBySection] = useState<Record<string, Record<string, string>>>(
    initialAnswersBySection ?? {},
  );
  const [error, setError] = useState('');
  const [offEnriching, setOffEnriching] = useState(false);
  const foodComponentsTouchedRef = useRef(false);

  const section = sections[sectionIndex];
  const step = section.steps[stepIndex];
  const sectionAnswers = answersBySection[section.type] ?? {};
  const totalSections = sections.length;
  const totalStepsInSection = section.steps.length;
  const overallStepNumber =
    sections.slice(0, sectionIndex).reduce((sum, item) => sum + item.steps.length, 0) +
    stepIndex +
    1;
  const overallStepsTotal = sections.reduce((sum, item) => sum + item.steps.length, 0);
  const isLastStep = sectionIndex === totalSections - 1 && stepIndex === totalStepsInSection - 1;
  const canSkipSection =
    allowSkipSection &&
    totalSections > 1 &&
    (!step.required || getDiaryStepAnswers(section, sectionAnswers).length > 0);

  const nutritionFood = section.type === 'Питание' ? (sectionAnswers.food ?? '').trim() : '';

  useEffect(() => {
    if (section.type !== 'Питание') return;
    const food = nutritionFood;
    if (food.length < 2) {
      setOffEnriching(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setOffEnriching(true);
      void enrichDishFromOpenFoods(food)
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

  const scalePreview =
    section.type === 'Шкала' && isLastStep
      ? (() => {
          const scaleId = getScaleIdFromAnswers(sectionAnswers);
          return scaleId ? computeScaleScore(scaleId, sectionAnswers) : null;
        })()
      : null;

  const pefZonePreview =
    section.type === 'Пикфлоуметрия'
      ? (() => {
          const value = parsePefNumeric(sectionAnswers.pefValue);
          if (!value) return null;
          const personalBest = resolvePersonalBestPef({
            explicitBest: sectionAnswers.pefBest,
            planBest: planPersonalBestPef,
          });
          if (!personalBest) return null;
          const zone = computePefZone(value, personalBest);
          if (!zone) return null;
          const percent = computePefPercentOfBest(value, personalBest);
          return { zone, percent };
        })()
      : null;

  const setAnswer = (stepId: string, value: string) => {
    setAnswersBySection((prev) => {
      let nextSectionAnswers = {
        ...(prev[section.type] ?? {}),
        [stepId]: value,
      };
      if (stepId === 'medicine' && section.type === 'Лекарство' && drugIntolerances?.length) {
        const alert = buildIntoleranceAlert(value, drugIntolerances);
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

  const setFoodComponentSelection = (selectedIds: string[]) => {
    foodComponentsTouchedRef.current = true;
    setAnswersBySection((prev) => {
      const current = { ...(prev['Питание'] ?? {}) };
      current.foodComponents = serializeSelectedComponentIds(selectedIds);
      const next = applyDishBreakdownToAnswers(current, profileAllergiesJson);
      return { ...prev, Питание: next };
    });
  };

  const handleVoiceTranscript = (transcript: string) => {
    setAnswersBySection((prev) => {
      const current = { ...(prev[section.type] ?? {}) };
      if (section.type === 'Симптомы') {
        const parsed = parseVoiceDiaryUtterance(transcript);
        return {
          ...prev,
          [section.type]: applyVoiceParseToAnswers(current, parsed, {
            sectionType: 'Симптомы',
            targetStepId: step.id,
          }),
        };
      }
      return {
        ...prev,
        [section.type]: {
          ...current,
          [step.id]: applyVoiceParseToAnswers(
            { [step.id]: current[step.id] ?? '' },
            { transcript },
            { targetStepId: step.id },
          )[step.id],
        },
      };
    });
  };

  const goNext = () => {
    const validationError =
      section.type === 'Шкала' && isLastStep
        ? validateClinicalScale(sectionAnswers)
        : validateDiarySectionStep(section, stepIndex, sectionAnswers);
    if (validationError) {
      setError(tDiaryError(validationError));
      return;
    }

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

  const goBack = () => {
    setError('');
    if (stepIndex > 0) {
      setStepIndex((value) => value - 1);
      return;
    }
    if (sectionIndex > 0) {
      const prevSection = sections[sectionIndex - 1];
      setSectionIndex((value) => value - 1);
      setStepIndex(prevSection.steps.length - 1);
    }
  };

  const skipSection = () => {
    setError('');
    if (sectionIndex < totalSections - 1) {
      setSectionIndex((value) => value + 1);
      setStepIndex(0);
      return;
    }
    finishWizard();
  };

  const finishWizard = () => {
    let scaleError: string | null = null;
    const entries = sections.flatMap((item) => {
      const answers = answersBySection[item.type] ?? {};
      if (!hasSectionAnswers(item, answers)) return [];

      if (item.type === 'Шкала') {
        scaleError = validateClinicalScale(answers);
        if (scaleError) return [];
        const enriched = enrichScaleAnswers(answers);
        return [{ type: item.type, details: encodeDiaryDetails(enriched, item.type) }];
      }

      const photoUris = getDiaryPhotoUrisFromAnswers(answers);
      return [
        {
          type: item.type,
          details: encodeDiaryDetails(answers, item.type),
          photoUris: photoUris.length ? photoUris : undefined,
        },
      ];
    });

    if (entries.length === 0) {
      setError(scaleError ? tDiaryError(scaleError) : t('diaryWizard.fillOneSection'));
      return;
    }

    onComplete(entries);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.progressText} testID="diary-wizard-step-label">
        {t('diaryWizard.stepOfSection', {
          current: overallStepNumber,
          total: overallStepsTotal,
          section: section.title,
        })}
      </Text>

      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${(overallStepNumber / overallStepsTotal) * 100}%` }]}
        />
      </View>

      <Text style={styles.stepLabel}>{step.label}</Text>
      {step.hint ? <Text style={styles.stepHint}>{step.hint}</Text> : null}
      {step.field === 'checklist' && step.id === 'foodComponents' ? (
        <DishComponentsField
          foodText={sectionAnswers.food ?? ''}
          selectedRaw={sectionAnswers.foodComponents ?? ''}
          componentsDefRaw={sectionAnswers.foodComponentsDef ?? ''}
          dishId={sectionAnswers.foodDishId ?? ''}
          dishName={sectionAnswers.foodDishName ?? ''}
          conflictsSummary={sectionAnswers.foodComponentConflicts ?? ''}
          profileAllergiesJson={profileAllergiesJson}
          offEnriching={offEnriching}
          offSource={sectionAnswers.foodOffSource ?? ''}
          offProductName={sectionAnswers.foodOffName ?? ''}
          onChangeSelection={setFoodComponentSelection}
        />
      ) : (
        <>
          <StepField
            step={step}
            value={sectionAnswers[step.id] ?? ''}
            onChange={(value) => setAnswer(step.id, value)}
          />
          {step.field === 'text' ? (
            <VoiceNoteButton
              testID="diary-wizard-voice"
              onTranscript={handleVoiceTranscript}
            />
          ) : null}
        </>
      )}

      {scalePreview ? (
        <Text style={styles.scalePreview}>
          {t('diaryWizard.scalePreview', {
            score: scalePreview.total,
            interpretation: scalePreview.interpretation,
          })}
        </Text>
      ) : null}

      {pefZonePreview ? (
        <PefZonePreview zone={pefZonePreview.zone} percent={pefZonePreview.percent} />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          style={[styles.secondaryBtn, sectionIndex === 0 && stepIndex === 0 && styles.btnDisabled]}
          disabled={sectionIndex === 0 && stepIndex === 0}
          onPress={goBack}>
          <Text style={styles.secondaryText}>{t('common.back')}</Text>
        </Pressable>
        <Pressable style={styles.primaryBtn} onPress={goNext} testID="diary-wizard-primary">
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

interface DiaryLegacyEditorProps {
  value: string;
  onCancel: () => void;
  onSave: (details: string) => void;
  onDelete?: () => void;
}

export function DiaryLegacyEditor({ value, onCancel, onSave, onDelete }: DiaryLegacyEditorProps) {
  const theme = useTheme();
  const styles = useMemo(() => createLegacyStyles(theme), [theme]);
  const { t } = useTranslation();
  const [text, setText] = useState(value);
  const [error, setError] = useState('');

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError(t('diaryWizard.enterEntryText'));
      return;
    }
    onSave(trimmed);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{t('diaryWizard.editEntry')}</Text>
        <Pressable onPress={onCancel}>
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </Pressable>
      </View>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={t('diaryWizard.entryPlaceholder')}
        placeholderTextColor={theme.colors.textMuted}
        multiline
        textAlignVertical="top"
      />
      <VoiceNoteButton
        testID="diary-legacy-voice"
        onTranscript={(transcript) => {
          setText((prev) =>
            applyVoiceParseToAnswers({ text: prev }, { transcript }, { targetStepId: 'text' }).text,
          );
        }}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primaryBtn} onPress={handleSave}>
        <Text style={styles.primaryText}>{t('diary.saveChanges')}</Text>
      </Pressable>
      {onDelete ? (
        <Pressable style={styles.deleteBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
          <Text style={styles.deleteText}>{t('diaryWizard.deleteEntry')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PefZonePreview({ zone, percent }: { zone: PefZone; percent: number | null }) {
  const theme = useTheme();
  const styles = useMemo(() => createPefZoneStyles(theme), [theme]);
  const { t } = useTranslation();
  const color =
    zone === 'green'
      ? theme.colors.success
      : zone === 'yellow'
        ? theme.colors.warning
        : theme.colors.danger;

  return (
    <View style={[styles.wrap, { borderColor: color, backgroundColor: `${color}14` }]}>
      <Text style={[styles.title, { color }]}>
        {t('diaryWizard.pefZone', { zone: t(`asthma.zone.${zone}`), percent: percent ?? '—' })}
      </Text>
      <Text style={styles.hint}>{t(`asthma.zoneHint.${zone}`)}</Text>
    </View>
  );
}

function createPefZoneStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: {
      marginTop: 12,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      gap: 4,
    },
    title: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
    },
    hint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
    },
  });
}

function DishComponentsField({
  foodText,
  selectedRaw,
  componentsDefRaw,
  dishId,
  dishName,
  conflictsSummary,
  profileAllergiesJson,
  offEnriching,
  offSource,
  offProductName,
  onChangeSelection,
}: {
  foodText: string;
  selectedRaw: string;
  componentsDefRaw: string;
  dishId: string;
  dishName: string;
  conflictsSummary: string;
  profileAllergiesJson: string;
  offEnriching: boolean;
  offSource: string;
  offProductName: string;
  onChangeSelection: (ids: string[]) => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createFieldStyles(theme), [theme]);
  const { t } = useTranslation();

  const selectedIds = parseSelectedComponentIds(selectedRaw);
  const storedDefs = parseDishComponentDefs(componentsDefRaw);
  const breakdown = buildDishBreakdown(
    foodText,
    profileAllergiesJson,
    selectedRaw ? selectedIds : undefined,
    {
      components: storedDefs.length ? storedDefs : undefined,
      dishId: dishId || null,
      dishName: dishName || null,
    },
  );

  if (!foodText.trim()) {
    return <Text style={styles.checklistHint}>{t('diaryWizard.dishEnterFoodFirst')}</Text>;
  }

  if (!breakdown.components.length && !offEnriching) {
    return <Text style={styles.checklistHint}>{t('diaryWizard.dishUnknown')}</Text>;
  }

  if (!breakdown.components.length && offEnriching) {
    return (
      <View style={styles.checklistWrap} testID="diary-dish-off-loading">
        <ActivityIndicator color={theme.colors.accent} />
        <Text style={styles.checklistHint}>{t('diaryWizard.dishOffLoading')}</Text>
      </View>
    );
  }

  const toggle = (id: string) => {
    const current = new Set(
      selectedRaw ? selectedIds : breakdown.components.map((item) => item.id),
    );
    if (current.has(id)) current.delete(id);
    else current.add(id);
    onChangeSelection(Array.from(current));
  };

  const showOffBadge = offSource === 'openfoodfacts' || offSource === 'catalog' || offSource === 'mixed';

  return (
    <View style={styles.checklistWrap} testID="diary-dish-checklist">
      {breakdown.dishName ? (
        <Text style={styles.checklistDish}>
          {t('diaryWizard.dishMatched', { dish: breakdown.dishName })}
        </Text>
      ) : null}
      {showOffBadge ? (
        <Text style={styles.offSource} testID="diary-dish-off-source">
          {t('diaryWizard.dishOffEnriched', {
            product: offProductName || breakdown.dishName || 'Open Food Facts',
          })}
        </Text>
      ) : null}
      {offEnriching ? (
        <View style={styles.offLoadingRow}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={styles.checklistHint}>{t('diaryWizard.dishOffLoading')}</Text>
        </View>
      ) : null}
      <Text style={styles.checklistHint}>{t('diaryWizard.dishHint')}</Text>
      <View style={styles.choiceGrid}>
        {breakdown.components.map((component) => {
          const active = component.selected;
          const conflict = component.conflict;
          return (
            <Pressable
              key={component.id}
              testID={`diary-dish-component-${component.id}`}
              style={[
                styles.choiceChip,
                active && styles.choiceChipActive,
                conflict === 'direct' && styles.conflictDirect,
                conflict === 'cross' && styles.conflictCross,
              ]}
              onPress={() => toggle(component.id)}>
              <Text
                style={[
                  styles.choiceText,
                  active && styles.choiceTextActive,
                  conflict === 'direct' && styles.conflictText,
                  conflict === 'cross' && styles.conflictCrossText,
                ]}>
                {active ? '✓ ' : ''}
                {component.nameRu}
                {conflict === 'direct' ? ' ⚠' : conflict === 'cross' ? ' ~' : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {conflictsSummary ? (
        <Text style={styles.conflictBanner} testID="diary-dish-conflicts">
          {t('diaryWizard.dishConflicts', { list: conflictsSummary })}
        </Text>
      ) : null}
    </View>
  );
}

function StepField({
  step,
  value,
  onChange,
}: {
  step: DiaryStep;
  value: string;
  onChange: (value: string) => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createFieldStyles(theme), [theme]);
  const { t } = useTranslation();

  if (step.field === 'photo') {
    const uris = parseDiaryPhotoUris(value);
    const canAdd = canAddMorePhotos(value);

    const addFromLibrary = async () => {
      const uri = await pickDiaryPhotoFromLibrary();
      if (uri) onChange(addPhotoUri(value, uri));
    };
    const addFromCamera = async () => {
      const uri = await captureDiaryPhoto();
      if (uri) onChange(addPhotoUri(value, uri));
    };

    return (
      <View style={styles.photoWrap} testID="diary-photo-step">
        <Text style={styles.photoHint}>{t('diaryWizard.photoHint')}</Text>
        <View style={styles.photoActions}>
          {Platform.OS !== 'web' ? (
            <Pressable
              style={[styles.photoBtn, !canAdd && styles.btnDisabled]}
              disabled={!canAdd}
              onPress={() => void addFromCamera()}
              testID="diary-photo-camera">
              <Ionicons name="camera-outline" size={18} color={theme.colors.accent} />
              <Text style={styles.photoBtnText}>{t('diaryWizard.photoCamera')}</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={[styles.photoBtn, !canAdd && styles.btnDisabled]}
            disabled={!canAdd}
            onPress={() => void addFromLibrary()}
            testID="diary-photo-library">
            <Ionicons name="images-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.photoBtnText}>{t('diaryWizard.photoLibrary')}</Text>
          </Pressable>
        </View>
        {uris.length ? (
          <View style={styles.photoGrid}>
            {uris.map((uri) => (
              <View key={uri} style={styles.photoThumbWrap}>
                <Image source={{ uri }} style={styles.photoThumb} />
                <Pressable
                  style={styles.photoRemove}
                  onPress={() => onChange(removePhotoUri(value, uri))}
                  accessibilityRole="button"
                  accessibilityLabel={t('diaryWizard.photoRemove')}>
                  <Ionicons name="close-circle" size={22} color={theme.colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.photoEmpty}>{t('diaryWizard.photoEmpty')}</Text>
        )}
      </View>
    );
  }

  if (step.field === 'choice' && step.choices) {
    const selected = step.multiSelect ? parseMultiChoiceValue(value) : [];
    return (
      <View style={styles.choiceGrid} testID={step.multiSelect ? 'diary-multi-choice' : undefined}>
        {step.choices.map((choice) => {
          const active = step.multiSelect ? selected.includes(choice) : value === choice;
          return (
            <Pressable
              key={choice}
              testID={step.multiSelect ? `diary-multi-choice-${choice}` : undefined}
              style={[styles.choiceChip, active && styles.choiceChipActive]}
              onPress={() =>
                onChange(step.multiSelect ? toggleMultiChoiceValue(value, choice) : choice)
              }>
              <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
                {step.multiSelect && active ? '✓ ' : ''}
                {choice}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <TextInput
      testID="diary-wizard-field"
      style={[styles.input, step.multiline && styles.inputMultiline]}
      value={value}
      onChangeText={onChange}
      placeholder={step.placeholder}
      placeholderTextColor={theme.colors.textMuted}
      multiline={step.multiline}
      textAlignVertical={step.multiline ? 'top' : 'center'}
    />
  );
}

function createLegacyStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: {
      gap: 14,
      padding: 16,
      borderRadius: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    cancelText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
    input: {
      minHeight: 140,
      backgroundColor: colors.card,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.borderInput,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: Platform.OS === 'web' ? WEB_INPUT_FONT_SIZE : 15,
      fontFamily: fonts.sans,
      color: colors.text,
      lineHeight: 22,
    },
    error: {
      fontFamily: fonts.sansSemiBold,
      color: colors.danger,
      fontSize: 13,
      fontWeight: '600',
    },
    primaryBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 6,
      backgroundColor: colors.accent,
      minHeight: 44,
    },
    primaryText: {
      fontFamily: fonts.sansSemiBold,
      color: colors.onAccent,
      fontWeight: '600',
      fontSize: 15,
    },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 8,
    },
    deleteText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.danger,
    },
  });
}

function createFieldStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    input: {
      backgroundColor: colors.card,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.borderInput,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: Platform.OS === 'web' ? WEB_INPUT_FONT_SIZE : 15,
      fontFamily: fonts.sans,
      color: colors.text,
    },
    inputMultiline: { minHeight: 120, lineHeight: 22 },
    choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    choiceChip: {
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    choiceChipActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
    choiceText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    choiceTextActive: { color: colors.accent },
    photoWrap: { gap: 10 },
    photoHint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    photoActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    photoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    photoBtnText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    photoThumbWrap: { width: 88, height: 88, borderRadius: 8, overflow: 'hidden' },
    photoThumb: { width: '100%', height: '100%' },
    photoRemove: { position: 'absolute', top: 2, right: 2 },
    photoEmpty: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textMuted,
    },
    btnDisabled: { opacity: 0.45 },
    checklistWrap: { gap: 10 },
    checklistDish: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.head,
    },
    checklistHint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    offSource: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.accent,
      lineHeight: 16,
    },
    offLoadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    conflictDirect: {
      borderColor: colors.danger,
      backgroundColor: colors.dangerLight,
    },
    conflictCross: {
      borderColor: colors.warning,
      backgroundColor: colors.warningLight,
    },
    conflictText: {
      color: colors.danger,
    },
    conflictCrossText: {
      color: colors.warning,
    },
    conflictBanner: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.danger,
      lineHeight: 18,
      marginTop: 4,
    },
  });
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: {
      gap: 14,
      padding: 16,
      borderRadius: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    progressText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    progressTrack: {
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 999 },
    stepLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 17,
      fontWeight: '600',
      color: colors.head,
      lineHeight: 24,
    },
    stepHint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 4,
    },
    scalePreview: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.accent,
      lineHeight: 18,
      backgroundColor: colors.accentLight,
      borderRadius: 6,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.accentMid,
    },
    error: {
      fontFamily: fonts.sansSemiBold,
      color: colors.danger,
      fontSize: 13,
      fontWeight: '600',
    },
    actions: { flexDirection: 'row', gap: 8 },
    secondaryBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
      minHeight: 44,
    },
    secondaryText: {
      fontFamily: fonts.sansSemiBold,
      color: colors.text,
      fontWeight: '600',
      fontSize: 14,
    },
    primaryBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      borderRadius: 6,
      backgroundColor: colors.accent,
      minHeight: 44,
    },
    primaryText: {
      fontFamily: fonts.sansSemiBold,
      color: colors.onAccent,
      fontWeight: '600',
      fontSize: 14,
    },
    btnDisabled: { opacity: 0.45 },
    skipBtn: { alignItems: 'center', paddingVertical: 4 },
    skipText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 4,
    },
    deleteText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.danger,
    },
  });
}
