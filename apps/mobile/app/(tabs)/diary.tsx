import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  DIARY_AUTO_STEP_IDS,
  buildCourseSetupOptions,
  buildDiaryEntryPickerOptions,
  formatDiaryDate,
  formatDiaryEntrySummary,
  getDiaryEntryAnswers,
  normalizeSeverity,
  getDiarySection,
  getAsthmaPlanPersonalBest,
  getProfileAgeYears,
  isDiaryHistoryVisible,
  parseAllergies,
  type ClinicalScaleId,
  type DiaryAutoMetadata,
  type DiarySection,
  type MedicineAgeResolution,
  type MedicineCard,
} from '@allerguide/core';
import {
  addDiaryEntries,
  deleteDiaryEntry,
  getDiaryEntries,
  mergePhotosIntoAnswers,
  updateDiaryEntry,
} from '@/src/services/diary-service';
import { listDiaryAttachmentsForEntries } from '@/src/services/diary-attachment-service';
import {
  rememberMedicineCard,
  rememberMedicineFromDiaryAnswers,
} from '@/src/services/medicine-suggest-service';
import {
  buildClinicalScaleEditorState,
  buildDiarySectionEditorState,
} from '@/src/services/diary-section-service';
import { DiaryInsightsCard } from '@/src/components/DiaryInsightsCard';
import { FoodDrugAllergyCard } from '@/src/components/FoodDrugAllergyCard';
import { InsectAllergyCard } from '@/src/components/InsectAllergyCard';
import { AsthmaCard } from '@/src/components/AsthmaCard';
import { getProfileCapabilities } from '@/src/services/profile-capabilities-service';
import { getAsthmaActionPlan } from '@/src/services/asthma-action-plan-service';
import { getAllergyPassport } from '@/src/services/sos-passport-service';
import { getFoodDrugRegistry } from '@/src/services/food-drug-registry-service';
import { getInsectActionPlan } from '@/src/services/insect-action-plan-service';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { ScreenEyebrow } from '@/src/components/ScreenEyebrow';
import { GlassCard } from '@/src/components/GlassCard';
import { EmptyState } from '@/src/components/EmptyState';
import { Button } from '@/src/components/Button';
import { CardTitle } from '@/src/components/CardTitle';
import { Disclaimer } from '@/src/components/Disclaimer';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { DiaryLegacyEditor, DiaryWizard } from '@/src/components/DiaryWizard';
import { DiaryEditorModal } from '@/src/components/DiaryEditorModal';
import { DiaryEntryTypePickerModal } from '@/src/components/DiaryEntryTypePickerModal';
import { CourseSetupModal } from '@/src/components/CourseSetupModal';
import {
  MedicinePhotoStep,
  MedicineRecognitionNotice,
} from '@/src/components/MedicinePhotoStep';
import { NutritionCaptureStep } from '@/src/components/NutritionCaptureStep';
import type { DishEnrichmentResult } from '@/src/services/dish-off-enrichment-service';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import {
  diaryOutcomeMessageKey,
  resolveZoneColors,
  zoneFromDiarySeverity,
} from '@/src/hooks/use-zone-colors';
import { useTranslation } from '@/src/store/locale-store';
import { localizeDiarySections, localizeDiaryType } from '@/src/i18n/content';
import type { DiaryEntry } from '@/src/types';
import { ProfileHeaderButton } from '@/src/components/ProfileHeaderButton';
import { collectDiaryAutoMetadata } from '@/src/services/diary-auto-metadata-service';
import { reconcileAllReminders } from '@/src/services/reminder-reconcile-service';
import { logCaughtError } from '@/src/services/error-reporting';
import { confirmDestructiveAction } from '@/src/utils/confirm-destructive-action';
import { getOrLoadActiveProfileId } from '@/src/services/profile-service';

const TYPE_ICONS: Record<string, string> = {
  Симптомы: 'pulse',
  Лекарство: 'medkit',
  Питание: 'restaurant',
  Триггер: 'warning',
  Кожа: 'body',
  Пикфлоуметрия: 'speedometer',
  АСИТ: 'fitness',
  'Укус насекомого': 'bug',
  'Визит к врачу': 'calendar',
  Заметка: 'create',
  Шкала: 'analytics',
  Терапия: 'medical',
};

type EditorState =
  | { mode: 'medicinePhoto' }
  | { mode: 'nutritionCapture' }
  | {
      mode: 'section';
      sectionType: string;
      prefill?: Record<string, Record<string, string>>;
      simplifiedSection?: DiarySection;
      notice?: ReactNode;
      initialStepId?: string;
    }
  | { mode: 'edit'; entry: DiaryEntry; legacy?: boolean };

function hideAutoSteps(section: DiarySection): DiarySection {
  return {
    ...section,
    steps: section.steps.filter((step) => !DIARY_AUTO_STEP_IDS.has(step.id)),
  };
}

export default function DiaryScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, locale, content } = useTranslation();
  const localeContent = content();
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const activeProfile = useAppStore((s) => s.activeProfile);
  const [list, setList] = useState<DiaryEntry[]>([]);
  const [photoUrisByEntry, setPhotoUrisByEntry] = useState<Record<number, string[]>>({});
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [entryPickerOpen, setEntryPickerOpen] = useState(false);
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const [autoMetadata, setAutoMetadata] = useState<DiaryAutoMetadata>({});
  const [refreshing, setRefreshing] = useState(false);
  const loadRequestId = useRef(0);
  const localizedSections = useMemo(
    () => localizeDiarySections(locale, localeContent),
    [locale, localeContent],
  );
  /** Bump on focus so condition gating re-reads app_settings after profile edit. */
  const [capabilitiesTick, setCapabilitiesTick] = useState(0);
  const profileCapabilities = useMemo(
    () => (activeProfile ? getProfileCapabilities(activeProfile) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick forces re-read of profileConditions settings
    [activeProfile, capabilitiesTick],
  );
  const profileConditions = useMemo(
    () => profileCapabilities?.gatingConditions ?? [],
    [profileCapabilities],
  );
  const entryPickerOptions = useMemo(
    () =>
      buildDiaryEntryPickerOptions({
        gatingConditions: profileConditions,
        recommendedScaleIds: profileCapabilities?.recommendedScaleIds ?? [],
      }),
    [profileConditions, profileCapabilities],
  );
  const asitEnabled = profileCapabilities?.modules.asit ?? false;
  const courseSetupOptions = useMemo(
    () => buildCourseSetupOptions({ asitEnabled }),
    [asitEnabled],
  );
  const drugFocusEnabled = profileCapabilities?.modules.drugFocus ?? false;
  const insectFocusEnabled = profileCapabilities?.modules.insectSting ?? false;
  const peakFlowEnabled = profileCapabilities?.modules.peakFlow ?? false;
  const foodDrugRegistry = useMemo(
    () => (activeProfileId ? getFoodDrugRegistry(activeProfileId) : null),
    [activeProfileId],
  );
  const drugIntolerances = useMemo(() => {
    if (!activeProfileId) return [];
    return getAllergyPassport(activeProfileId).drugIntolerances;
  }, [activeProfileId]);
  const insectActionPlan = useMemo(
    () => (activeProfileId ? getInsectActionPlan(activeProfileId) : null),
    [activeProfileId],
  );
  const asthmaActionPlan = useMemo(
    () => (activeProfileId ? getAsthmaActionPlan(activeProfileId) : null),
    [activeProfileId],
  );
  const planPersonalBestPef = useMemo(
    () => getAsthmaPlanPersonalBest(asthmaActionPlan),
    [asthmaActionPlan],
  );

  const loadAutoMetadata = async () => {
    const metadata = await collectDiaryAutoMetadata({
      profileId: activeProfileId,
      profileAllergiesJson: activeProfile?.allergies ?? '[]',
      locale,
    });
    setAutoMetadata(metadata);
  };

  const openSection = async (
    sectionType: string,
    extras?: {
      recognizedCard?: MedicineCard;
      photoUri?: string;
      notice?: ReactNode;
      recognizedDish?: {
        food: string;
        components: DishEnrichmentResult['components'];
        dishId?: string;
        dishName?: string;
        source?: string;
        productBarcode?: string;
        productName?: string;
      };
      initialStepId?: string;
    },
  ) => {
    const editorState = await buildDiarySectionEditorState({
      sectionType,
      profileId: activeProfileId,
      profileAllergiesJson: activeProfile?.allergies ?? '[]',
      locale,
      profileBirthYear: activeProfile?.birthYear,
      recognizedCard: extras?.recognizedCard,
      photoUri: extras?.photoUri,
      recognizedDish: extras?.recognizedDish,
    });
    await loadAutoMetadata();
    setEntryPickerOpen(false);
    setEditor({
      mode: 'section',
      sectionType: editorState.sectionType,
      prefill: editorState.prefill,
      simplifiedSection: editorState.section,
      notice: extras?.notice,
      initialStepId: extras?.initialStepId,
    });
  };

  const openMedicinePhoto = () => {
    setEntryPickerOpen(false);
    setEditor({ mode: 'medicinePhoto' });
  };

  const openNutritionCapture = () => {
    setEntryPickerOpen(false);
    setEditor({ mode: 'nutritionCapture' });
  };

  const continueNutritionFromCapture = async (input: {
    food: string;
    enrichment: DishEnrichmentResult;
  }) => {
    await openSection('Питание', {
      recognizedDish: {
        food: input.food,
        components: input.enrichment.components,
        dishId: input.enrichment.dishId,
        dishName: input.enrichment.dishName,
        source: input.enrichment.source,
        productBarcode: input.enrichment.productBarcode,
        productName: input.enrichment.productName,
      },
      initialStepId: 'foodComponents',
    });
  };

  const continueMedicineFromPhoto = async (input: {
    card: MedicineCard;
    ageUsage: MedicineAgeResolution | null;
    photoUri?: string;
  }) => {
    void rememberMedicineCard(input.card);
    await openSection('Лекарство', {
      recognizedCard: input.card,
      photoUri: input.photoUri,
      notice: <MedicineRecognitionNotice card={input.card} ageUsage={input.ageUsage} />,
    });
  };

  const openScale = async (scaleId: ClinicalScaleId) => {
    const editorState = buildClinicalScaleEditorState(scaleId);
    await loadAutoMetadata();
    setEntryPickerOpen(false);
    setEditor({
      mode: 'section',
      sectionType: editorState.sectionType,
      prefill: editorState.prefill,
      simplifiedSection: editorState.section,
    });
  };

  const load = useCallback(async (profileId = activeProfileId) => {
    const requestId = loadRequestId.current + 1;
    loadRequestId.current = requestId;
    if (!profileId) {
      setList([]);
      setPhotoUrisByEntry({});
      return;
    }

    const entries = await getDiaryEntries(profileId);
    if (requestId !== loadRequestId.current) return;

    setList(entries);
    const attachments = listDiaryAttachmentsForEntries(entries.map((e) => e.id));
    const map: Record<number, string[]> = {};
    for (const item of attachments) {
      if (!map[item.entryId]) map[item.entryId] = [];
      map[item.entryId].push(item.localPath);
    }
    setPhotoUrisByEntry(map);
  }, [activeProfileId]);

  const refresh = useCallback(async () => {
    if (!activeProfileId) return;
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [activeProfileId, load]);

  useFocusEffect(
    useCallback(() => {
      setCapabilitiesTick((tick) => tick + 1);
      const profileId = getOrLoadActiveProfileId();
      void load(profileId);
      return () => {
        loadRequestId.current += 1;
      };
    }, [load]),
  );

  const closeEditor = () => setEditor(null);

  const handleCreate = async (entries: { type: string; details: string; photoUris?: string[] }[]) => {
    const profileId = activeProfileId ?? getOrLoadActiveProfileId();
    if (!profileId) return;
    for (const entry of entries) {
      if (entry.type !== 'Лекарство') continue;
      const answers = getDiaryEntryAnswers(entry.type, entry.details);
      if (answers) void rememberMedicineFromDiaryAnswers(answers);
    }
    const results = await addDiaryEntries(profileId, entries);
    const failed = results.find((result) => !result.ok);
    if (failed && !failed.ok) {
      logCaughtError('DiaryScreen.handleCreate', new Error(failed.code));
      return;
    }
    closeEditor();
    await load(profileId);
    void reconcileAllReminders();
  };

  const handleUpdate = async (
    entry: DiaryEntry,
    type: string,
    details: string,
    photoUris?: string[],
  ) => {
    if (type === 'Лекарство') {
      const answers = getDiaryEntryAnswers(type, details);
      if (answers) void rememberMedicineFromDiaryAnswers(answers);
    }
    const result = await updateDiaryEntry(entry.id, { type, details, photoUris });
    if (!result.ok) {
      logCaughtError('DiaryScreen.handleUpdate', new Error(result.code));
      return;
    }
    closeEditor();
    await load();
    void reconcileAllReminders();
  };

  const confirmDelete = (entry: DiaryEntry) => {
    confirmDestructiveAction({
      title: t('diary.deleteTitle'),
      message: t('diary.deleteMessage', {
        type: localizeDiaryType(entry.type, localeContent),
      }),
      cancelLabel: t('common.cancel'),
      confirmLabel: t('common.delete'),
      onConfirm: async () => {
        const result = await deleteDiaryEntry(entry.id);
        if (!result.ok) throw new Error(result.code);
        closeEditor();
        await load();
        void reconcileAllReminders();
      },
      onError: (error) => {
        logCaughtError('DiaryScreen.confirmDelete', error);
      },
    });
  };

  const openEdit = (entry: DiaryEntry) => {
    const answers = getDiaryEntryAnswers(entry.type, entry.details);
    if (answers) {
      setEditor({ mode: 'edit', entry });
      return;
    }
    setEditor({ mode: 'edit', entry, legacy: true });
  };

  const renderEditor = () => {
    if (!editor) return null;

    if (editor.mode === 'medicinePhoto') {
      return (
        <MedicinePhotoStep
          ageYears={getProfileAgeYears(activeProfile?.birthYear)}
          onSkip={() => void openSection('Лекарство')}
          onContinue={(input) => void continueMedicineFromPhoto(input)}
        />
      );
    }

    if (editor.mode === 'nutritionCapture') {
      return (
        <NutritionCaptureStep
          onEnterManually={() => void openSection('Питание')}
          onContinue={(input) => void continueNutritionFromCapture(input)}
        />
      );
    }

    if (editor.mode === 'edit' && editor.legacy) {
      return (
        <DiaryLegacyEditor
          value={entryDetailsText(editor.entry)}
          onCancel={closeEditor}
          onSave={(details) => void handleUpdate(editor.entry, editor.entry.type, details)}
          onDelete={() => confirmDelete(editor.entry)}
        />
      );
    }

    const sectionType = editor.mode === 'section' ? editor.sectionType : editor.entry.type;
    const fallbackSection = editor.mode === 'section' ? editor.simplifiedSection : undefined;
    const baseSection =
      localizedSections.find((s) => s.type === sectionType) ??
      getDiarySection(sectionType) ??
      fallbackSection;
    if (!baseSection) return null;
    const rawSection =
      editor.mode === 'section' && editor.simplifiedSection ? editor.simplifiedSection : baseSection;
    const section = hideAutoSteps(rawSection);

    const initialAnswers =
      editor.mode === 'edit'
        ? mergePhotosIntoAnswers(
            getDiaryEntryAnswers(editor.entry.type, editor.entry.details) ?? {},
            editor.entry.id,
          )
        : editor.mode === 'section'
          ? editor.prefill?.[baseSection.type]
          : null;

    return (
      <DiaryWizard
          sections={[section]}
          initialAnswersBySection={initialAnswers ? { [section.type]: initialAnswers } : undefined}
          allowSkipSection={false}
          drugIntolerances={drugIntolerances}
          ageYears={getProfileAgeYears(activeProfile?.birthYear)}
          profileId={activeProfileId}
          planPersonalBestPef={planPersonalBestPef}
          profileAllergiesJson={activeProfile?.allergies ?? '[]'}
          autoMetadata={autoMetadata}
          notice={editor.mode === 'section' ? editor.notice : undefined}
          initialStepId={editor.mode === 'section' ? editor.initialStepId : undefined}
          submitLabel={editor.mode === 'edit' ? t('diary.saveChanges') : t('common.save')}
          onCancel={closeEditor}
          onComplete={(entries) => {
            const [entry] = entries;
            if (!entry) return;
            if (editor.mode === 'edit') {
              void handleUpdate(editor.entry, entry.type, entry.details, entry.photoUris);
              return;
            }
            void handleCreate(entries);
          }}
          onDelete={editor.mode === 'edit' ? () => confirmDelete(editor.entry) : undefined}
      />
    );
  };

  return (
    <Screen
      onRefresh={activeProfileId && !editor ? () => void refresh() : undefined}
      refreshing={refreshing}
      brandHeaderRight={<ProfileHeaderButton />}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ScreenEyebrow section={t('diary.eyebrow')} />
          <Text style={ui.docTitle}>{t('diary.title')}</Text>
          <Text style={ui.docMeta}>{t('diary.subtitle')}</Text>
        </View>
      </View>

      <Button
        testID="diary-new-entry"
        label={t('diary.newEntry')}
        variant="primary"
        block
        onPress={() => setEntryPickerOpen(true)}
      />
      <View style={styles.actionRow}>
        <View style={styles.actionHalf}>
          <Button
            testID="diary-setup-course"
            label={t('diary.courseShort')}
            variant="secondary"
            block
            icon="medical"
            onPress={() => setCoursePickerOpen(true)}
          />
        </View>
        <View style={styles.actionHalf}>
          <Button
            label={t('diary.reportShort')}
            variant="secondary"
            block
            icon="document"
            onPress={() => router.push('/doctor-report' as any)}
          />
        </View>
      </View>

      <DiaryEntryTypePickerModal
        visible={entryPickerOpen}
        options={entryPickerOptions}
        sectionTitle={(sectionType) =>
          localizedSections.find((section) => section.type === sectionType)?.title ??
          localizeDiaryType(sectionType, localeContent)
        }
        onClose={() => setEntryPickerOpen(false)}
        onSelectSection={(sectionType) => {
          if (sectionType === 'Лекарство') {
            openMedicinePhoto();
            return;
          }
          if (sectionType === 'Питание') {
            openNutritionCapture();
            return;
          }
          void openSection(sectionType);
        }}
        onSelectScale={(scaleId) => void openScale(scaleId)}
      />
      <CourseSetupModal
        visible={coursePickerOpen}
        options={courseSetupOptions}
        onClose={() => setCoursePickerOpen(false)}
        onSelect={(id) => {
          setCoursePickerOpen(false);
          if (id === 'asit') {
            router.push('/asit-course' as any);
            return;
          }
          router.push('/prescribed-therapy' as any);
        }}
      />

      <DiaryEditorModal visible={editor !== null} onClose={closeEditor}>
        {renderEditor()}
      </DiaryEditorModal>

      <DiaryInsightsCard entries={list} />

      {list.filter((item) => isDiaryHistoryVisible(item.type)).length === 0 ? (
        <EmptyState icon="document-text-outline" title={t('diary.history')} description={t('diary.empty')} />
      ) : (
        <GlassCard padded={false}>
          <View style={styles.listHead}>
            <View style={styles.listHeadPad}>
              <CardTitle>{t('diary.history')}</CardTitle>
            </View>
          </View>

          {list.filter((item) => isDiaryHistoryVisible(item.type)).map((item, index, visible) => {
            const icon = TYPE_ICONS[item.type] ?? 'create';
            const summary = formatDiaryEntrySummary(item.type, item.details);
            const photos = photoUrisByEntry[item.id] ?? [];
            const answers = getDiaryEntryAnswers(item.type, item.details);
            const severity = answers ? normalizeSeverity(answers, item.type) : null;
            const outcomeZone = zoneFromDiarySeverity(severity);
            const outcomeColors = resolveZoneColors(outcomeZone, theme.colors);
            return (
              <Pressable
                key={item.id}
                style={[styles.row, index < visible.length - 1 && styles.rowBorder]}
                onPress={() => openEdit(item)}>
                <View style={ui.feedIcon}>
                  <Ionicons name={icon as any} size={16} color={theme.colors.textSecondary} />
                </View>
                <View style={ui.feedBody}>
                  <Text style={ui.feedTitle}>{localizeDiaryType(item.type, localeContent)}</Text>
                  <Text style={ui.feedSub}>{summary}</Text>
                  {photos.length ? (
                    <View style={styles.photoRow}>
                      {photos.slice(0, 3).map((uri) => (
                        <Image key={uri} source={{ uri }} style={styles.photoThumb} />
                      ))}
                      {photos.length > 3 ? (
                        <Text style={styles.photoMore}>+{photos.length - 3}</Text>
                      ) : null}
                    </View>
                  ) : null}
                  <Text style={styles.cardMeta}>{formatDiaryDate(item.createdAt)}</Text>
                </View>
                {severity != null && outcomeColors ? (
                  <Text style={[styles.outcome, { color: outcomeColors.fg }]}>
                    {t(diaryOutcomeMessageKey(severity))}
                  </Text>
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                )}
              </Pressable>
            );
          })}
        </GlassCard>
      )}

      {drugFocusEnabled ? (
        <FoodDrugAllergyCard
          mode="drug"
          profileAllergies={activeProfile ? parseAllergies(activeProfile.allergies) : []}
          drugIntolerances={drugIntolerances}
          registry={foodDrugRegistry}
          entries={list}
          onLogFood={openNutritionCapture}
          onLogMedicine={openMedicinePhoto}
        />
      ) : null}

      {insectFocusEnabled && activeProfile ? (
        <InsectAllergyCard
          profileAllergies={parseAllergies(activeProfile.allergies)}
          plan={insectActionPlan}
          entries={list}
          onLogSting={() => void openSection('Укус насекомого')}
        />
      ) : null}

      {peakFlowEnabled ? (
        <AsthmaCard
          plan={asthmaActionPlan}
          entries={list}
          onLogPef={() => void openSection('Пикфлоуметрия')}
        />
      ) : null}

      <Disclaimer compact>{t('diary.disclaimerShort')}</Disclaimer>
    </Screen>
  );
}

function entryDetailsText(entry: DiaryEntry): string {
  const answers = getDiaryEntryAnswers(entry.type, entry.details);
  if (answers?.noteBody) return answers.noteBody;
  return entry.details.trim();
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerText: { flex: 1, gap: 2 },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
    },
    actionHalf: {
      flex: 1,
    },
    listHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 14,
    },
    listHeadPad: { paddingHorizontal: 16 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    cardMeta: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    outcome: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
    },
    photoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    photoThumb: { width: 40, height: 40, borderRadius: 6, backgroundColor: colors.surfaceMuted },
    photoMore: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
  });
}
