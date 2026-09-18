import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  buildCourseSetupOptions,
  buildDiaryEntryPickerOptions,
  formatDiaryDate,
  formatDiaryEntrySummary,
  getDiaryEntryAnswers,
  normalizeSeverity,
  getDiarySection,
  getAsthmaPlanPersonalBest,
  getProfileAgeYears,
  hideDiaryAutoSteps,
  isDiaryHistoryVisible,
  parseAllergies,
  startOfLocalDay,
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
  collectMedicineCardsFromDiaryEntries,
  rememberMedicineCard,
  rememberMedicineFromDiaryAnswers,
} from '@/src/services/medicine-suggest-service';
import {
  buildClinicalScaleEditorState,
  buildDiarySectionEditorState,
} from '@/src/services/diary-section-service';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { SeverityBadge, type SeverityLevel } from '@/src/components/SeverityBadge';
import { getProfileCapabilities } from '@/src/services/profile-capabilities-service';
import { getAsthmaActionPlan } from '@/src/services/asthma-action-plan-service';
import { getAllergyPassport } from '@/src/services/sos-passport-service';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { HintAnchor } from '@/src/components/hints/HintAnchor';
import { useHintTour } from '@/src/hooks/use-hint-tour';
import { EmptyState } from '@/src/components/EmptyState';
import { DiaryNewEntryFab } from '@/src/components/DiaryNewEntryFab';
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
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { density, radii, space } from '@/src/constants/layout';
import { fontSizes, lineHeights } from '@/src/constants/typography';
import { diaryOutcomeMessageKey } from '@/src/hooks/use-zone-colors';
import { useTranslation } from '@/src/store/locale-store';
import { localizeDiarySections, localizeDiaryType } from '@/src/i18n/content';
import type { DiaryEntry } from '@/src/types';
import { collectDiaryAutoMetadata } from '@/src/services/diary-auto-metadata-service';
import { reconcileAllReminders } from '@/src/services/reminder-reconcile-service';
import { logCaughtError } from '@/src/services/error-reporting';
import { confirmDestructiveAction } from '@/src/utils/confirm-destructive-action';
import { getOrLoadActiveProfileId } from '@/src/services/profile-service';

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

export default function DiaryScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, locale, content } = useTranslation();
  useHintTour('diary');
  const localeContent = content();
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const activeProfile = useAppStore((s) => s.activeProfile);
  const [list, setList] = useState<DiaryEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState(() => startOfLocalDay(new Date()));
  const weekDays = useMemo(() => {
    const today = startOfLocalDay(new Date());
    const mondayOffset = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + index);
      return startOfLocalDay(day);
    });
  }, []);
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
  const localMedicineCards = useMemo(
    () => collectMedicineCardsFromDiaryEntries(list),
    [list],
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
  const drugIntolerances = useMemo(() => {
    if (!activeProfileId) return [];
    return getAllergyPassport(activeProfileId).drugIntolerances;
  }, [activeProfileId]);
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
    setEntryPickerOpen(false);
    setEditor({
      mode: 'section',
      sectionType: editorState.sectionType,
      prefill: editorState.prefill,
      simplifiedSection: editorState.section,
      notice: extras?.notice,
      initialStepId: extras?.initialStepId,
    });
    // Pollen/scan/meds metadata is hidden enrichment merged on save: fetching it
    // must not delay the wizard, which has to open offline too.
    void loadAutoMetadata();
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
    const section = hideDiaryAutoSteps(rawSection);

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
          localMedicineCards={localMedicineCards}
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
      showBrandHeader={false}
      onRefresh={activeProfileId && !editor ? () => void refresh() : undefined}
      refreshing={refreshing}
      pinnedBottom={
        <View style={styles.fabRow} pointerEvents="box-none">
          <HintAnchor id="diary.newEntry">
            <DiaryNewEntryFab
              accessibilityLabel={t('diary.newEntry')}
              onPress={() => setEntryPickerOpen(true)}
            />
          </HintAnchor>
        </View>
      }>
      <ScreenHeader title={t('diary.symptomsTitle')} style={styles.screenHeader} />

      <View style={styles.calendarStrip}>
        {weekDays.map((day) => {
          const isActive = day.getTime() === selectedDay.getTime();
          const weekday = day.toLocaleDateString(locale, { weekday: 'short' });
          return (
            <Pressable
              key={day.toISOString()}
              testID={`diary-day-${day.getDate()}`}
              style={[styles.dayCell, isActive && styles.dayCellActive]}
              onPress={() => setSelectedDay(day)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              hitSlop={4}>
              <Text style={[styles.dayName, isActive && styles.dayNameActive]}>{weekday}</Text>
              <Text style={[styles.dayDate, isActive && styles.dayDateActive]}>{day.getDate()}</Text>
            </Pressable>
          );
        })}
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

      {(() => {
        const visible = list.filter((item) => {
          if (!isDiaryHistoryVisible(item.type)) return false;
          return startOfLocalDay(new Date(item.createdAt)).getTime() === selectedDay.getTime();
        });
        if (visible.length === 0) {
          return (
            <EmptyState icon="document-text-outline" title={t('diary.todayEntries')} description={t('diary.empty')} />
          );
        }
        return (
          <View style={styles.timeline} testID="diary-timeline">
            <View style={styles.timelineHeader}>
              <Text style={styles.timelineTitle}>{t('diary.todayEntries')}</Text>
              <Pressable onPress={() => setSelectedDay(startOfLocalDay(new Date()))} hitSlop={8}>
                <Text style={styles.clearFilter}>{t('diary.clearFilter')}</Text>
              </Pressable>
            </View>
            {visible.map((item) => {
              const summary = formatDiaryEntrySummary(item.type, item.details);
              const photos = photoUrisByEntry[item.id] ?? [];
              const answers = getDiaryEntryAnswers(item.type, item.details);
              const severity = answers ? normalizeSeverity(answers, item.type) : null;
              const timeLabel = new Date(item.createdAt).toLocaleTimeString(locale, {
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <Pressable
                  key={item.id}
                  style={styles.entryCard}
                  onPress={() => openEdit(item)}
                  accessibilityRole="button">
                  <View style={styles.entryTopRow}>
                    <View style={styles.entryTitleGroup}>
                      <Text style={styles.entryTitle}>{localizeDiaryType(item.type, localeContent)}</Text>
                      {severity != null ? (
                        <SeverityBadge
                          severity={diarySeverityLevel(severity)}
                          label={t(diaryOutcomeMessageKey(severity))}
                        />
                      ) : null}
                    </View>
                    <Text style={styles.entryTime}>{timeLabel}</Text>
                  </View>
                  <Text style={styles.entryDescription}>{summary || entryDetailsText(item)}</Text>
                  {photos.length ? (
                    <View style={styles.photoRow}>
                      {photos.slice(0, 3).map((uri) => (
                        <Image key={uri} source={{ uri }} style={styles.photoThumb} />
                      ))}
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        );
      })()}

      <DiaryEditorModal visible={editor !== null} onClose={closeEditor}>
        {renderEditor()}
      </DiaryEditorModal>
    </Screen>
  );
}

function diarySeverityLevel(severity: number): SeverityLevel {
  if (severity <= 0) return 'safe';
  if (severity === 1) return 'mild';
  if (severity === 2) return 'moderate';
  return 'severe';
}

function entryDetailsText(entry: DiaryEntry): string {
  const answers = getDiaryEntryAnswers(entry.type, entry.details);
  if (answers?.noteBody) return answers.noteBody;
  return entry.details.trim();
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    screenHeader: { paddingHorizontal: 0, paddingVertical: 4 },
    calendarStrip: {
      flexDirection: 'row',
      gap: 4,
      paddingBottom: space[4],
    },
    dayCell: {
      flex: 1,
      height: 65,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.card,
      borderRadius: radii.lg,
      minHeight: density.tapMinHeight,
    },
    dayCellActive: { backgroundColor: colors.accent },
    dayName: {
      fontFamily: fonts.sansMedium,
      fontSize: fontSizes.caption,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    dayNameActive: { color: colors.onAccent },
    dayDate: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.h4,
      fontWeight: '600',
      color: colors.head,
    },
    dayDateActive: { color: colors.onAccent },
    timeline: { gap: space[4] },
    timelineHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    timelineTitle: {
      fontFamily: fonts.sansBold,
      fontSize: fontSizes.h4,
      fontWeight: '700',
      color: colors.head,
    },
    clearFilter: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.caption,
      color: colors.textSecondary,
    },
    entryCard: {
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      padding: 18,
      gap: space[4],
    },
    entryTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: space[2],
    },
    entryTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      flex: 1,
      flexWrap: 'wrap',
    },
    entryTitle: {
      fontFamily: fonts.sansBold,
      fontSize: fontSizes.h4,
      fontWeight: '700',
      color: colors.head,
    },
    entryTime: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.caption,
      color: colors.textSecondary,
    },
    entryDescription: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      color: colors.head,
    },
    fabRow: {
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
    },
    photoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    photoThumb: { width: 40, height: 40, borderRadius: radii.sm, backgroundColor: colors.surfaceMuted },
  });
}
