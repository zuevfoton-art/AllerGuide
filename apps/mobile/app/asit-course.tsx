import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ASIT_PHASE_LABELS,
  ASIT_ROUTE_LABELS,
  DEFAULT_ASIT_REMINDER_HOUR,
  DEFAULT_ASIT_REMINDER_MINUTE,
  createEmptyAsitClinicalDiagnosis,
  findAllergenById,
  formatAsitReminderTime,
  isAsitReminderConfigured,
  normalizeScheduleLines,
  scheduleLinesToNotes,
  type AsitClinicalDiagnosis,
  type AsitCourse,
  type AsitPhase,
  type AsitRoute,
} from '@allerguide/core';
import { applyPrescriptionParseToAsitCourse } from '@allerguide/ai';
import { Screen } from '@/src/components/Screen';
import { ScreenEyebrow } from '@/src/components/ScreenEyebrow';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { DateTimeField } from '@/src/components/DateTimeField';
import { AllergenCatalogModal } from '@/src/components/AllergenCatalogModal';
import { PrescriptionCameraCapture } from '@/src/components/PrescriptionCameraCapture';
import { ScheduleLinesEditor } from '@/src/components/ScheduleLinesEditor';
import { ScheduleStagesEditor } from '@/src/components/ScheduleStagesEditor';
import { useAppStore } from '@/src/store/app-store';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { Ionicons } from '@expo/vector-icons';
import {
  createEmptyAsitCourse,
  getAsitCourse,
  saveAsitCourse,
} from '@/src/services/asit-course-service';
import { ensureNotificationPermission, syncAsitReminder } from '@/src/services/asit-reminder-service';
import { getAsitReminderNotificationContent } from '@/src/services/notification-content-service';
import { getProfileCapabilities } from '@/src/services/profile-capabilities-service';
import { pickPrescriptionPdf } from '@/src/services/prescription-photo-service';
import {
  recognizePrescription,
  type PrescriptionOcrHintCode,
} from '@/src/services/prescription-ocr-service';

const ROUTES: AsitRoute[] = ['slit', 'scit'];
const PHASES: AsitPhase[] = ['buildup', 'maintenance'];

type Step = 'form' | 'verify' | 'review';

export default function AsitCourseScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.activeProfile);
  const profileId = profile?.id;
  const [course, setCourse] = useState<AsitCourse>(() => createEmptyAsitCourse());
  const [step, setStep] = useState<Step>('form');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseText, setParseText] = useState('');
  const [parseTextOpen, setParseTextOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [ocrHint, setOcrHint] = useState<string | null>(null);

  const asitEnabled = useMemo(() => {
    if (!profile) return false;
    return getProfileCapabilities(profile).modules.asit;
  }, [profile]);

  useEffect(() => {
    if (!profileId || asitEnabled) return;
    void syncAsitReminder(profileId, null, getAsitReminderNotificationContent(createEmptyAsitCourse()));
  }, [profileId, asitEnabled]);

  useEffect(() => {
    if (!profileId) return;
    const existing = getAsitCourse(profileId);
    if (existing) {
      setCourse(existing);
      void syncAsitReminder(profileId, existing, getAsitReminderNotificationContent(existing));
    }
  }, [profileId]);

  const pickAllergen = useCallback(
    (ids: string[]) => {
      const id = ids[0];
      if (!id) return;
      const name = findAllergenById(id)?.name ?? id;
      setCourse((prev) => ({ ...prev, allergen: name, allergenId: id }));
    },
    [],
  );

  const hintFromCode = useCallback(
    (code: PrescriptionOcrHintCode | undefined, cloudError?: string) => {
      if (!code) return null;
      if (code === 'cloud_failed') {
        return t('asit.ocrCloudFailed', { error: cloudError || 'error' });
      }
      if (code === 'cloud_disabled') return t('asit.ocrCloudDisabled');
      if (code === 'empty_media') return t('asit.ocrEmptyMedia');
      return t('asit.ocrDemoHint');
    },
    [t],
  );

  const onPhotoCaptured = useCallback((uri: string) => {
    setCameraOpen(false);
    setCourse((prev) => ({ ...prev, prescriptionPhotoUri: uri }));
    setOcrHint(null);
  }, []);

  const pickPdf = async () => {
    const uri = await pickPrescriptionPdf();
    if (!uri) return;
    setCourse((prev) => ({ ...prev, prescriptionDocUri: uri }));
    setOcrHint(null);
  };

  const applyOcrOutcome = async (manualText?: string) => {
    setParsing(true);
    setOcrHint(null);
    try {
      const outcome = await recognizePrescription({
        photoUri: course.prescriptionPhotoUri,
        pdfUri: course.prescriptionDocUri,
        manualText,
      });
      setCourse((prev) => applyPrescriptionParseToAsitCourse(prev, outcome.parsed));
      if (outcome.text) setParseText(outcome.text);
      setOcrHint(hintFromCode(outcome.hintCode, outcome.cloudError));
      setParseTextOpen(false);
      // Stay on the form so prefilled fields (incl. clinical diagnosis) are visible.
    } finally {
      setParsing(false);
    }
  };

  const setScheduleLines = (scheduleLines: string[]) => {
    const lines = normalizeScheduleLines(scheduleLines);
    setCourse((prev) => ({
      ...prev,
      scheduleLines: lines,
      scheduleNotes: scheduleLinesToNotes(lines),
    }));
  };

  const setClinicalField = (key: keyof AsitClinicalDiagnosis, value: string) => {
    setCourse((prev) => ({
      ...prev,
      clinicalDiagnosis: {
        ...createEmptyAsitClinicalDiagnosis(),
        ...(prev.clinicalDiagnosis ?? {}),
        [key]: value,
      },
    }));
  };

  const startRecognize = () => {
    const hasMedia = Boolean(course.prescriptionPhotoUri || course.prescriptionDocUri);
    if (hasMedia) {
      void applyOcrOutcome();
      return;
    }
    setParseTextOpen(true);
  };

  const confirmVerify = () => {
    setCourse((prev) => ({ ...prev, verified: true }));
    setStep('review');
  };

  const save = async () => {
    if (!profileId) return;
    const lines = normalizeScheduleLines(course.scheduleLines, course.scheduleNotes);
    const toSave: AsitCourse = {
      ...course,
      scheduleLines: lines,
      scheduleNotes: scheduleLinesToNotes(lines),
      verified: course.scheduleStages?.length ? Boolean(course.verified) : true,
      activated: true,
      active: true,
    };
    saveAsitCourse(profileId, toSave);
    if (isAsitReminderConfigured(toSave)) {
      await ensureNotificationPermission();
    }
    await syncAsitReminder(profileId, toSave, getAsitReminderNotificationContent(toSave));
    router.back();
  };

  const goToNextFromForm = () => {
    if (!course.allergen.trim() || !course.drug.trim()) return;
    if (course.scheduleStages && course.scheduleStages.length > 0 && !course.verified) {
      setStep('verify');
      return;
    }
    setStep('review');
  };

  const reminderEnabled = isAsitReminderConfigured(course);

  const toggleReminder = (enabled: boolean) => {
    setCourse((prev) => {
      if (!enabled) {
        const next = { ...prev };
        delete next.reminderHour;
        delete next.reminderMinute;
        return next;
      }
      return {
        ...prev,
        reminderHour: prev.reminderHour ?? DEFAULT_ASIT_REMINDER_HOUR,
        reminderMinute: prev.reminderMinute ?? DEFAULT_ASIT_REMINDER_MINUTE,
      };
    });
  };

  if (!profile) {
    return (
      <Screen>
        <Text style={styles.empty}>{t('asit.noProfile')}</Text>
      </Screen>
    );
  }

  if (cameraOpen) {
    return (
      <PrescriptionCameraCapture
        visible
        title={t('asit.cameraTitle')}
        hint={t('asit.cameraHint')}
        galleryLabel={t('scanner.pickFromGallery')}
        shutterLabel={t('scanner.takePhoto')}
        cancelLabel={t('common.cancel')}
        onCancel={() => setCameraOpen(false)}
        onCaptured={onPhotoCaptured}
      />
    );
  }

  if (!asitEnabled) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <ScreenEyebrow section={t('asit.eyebrow')} />
            <Text style={ui.docTitle}>{t('asit.courseTitle')}</Text>
          </View>
        </View>
        <GlassCard>
          <Text style={styles.hint}>{t('asit.notEligible')}</Text>
        </GlassCard>
      </Screen>
    );
  }

  if (step === 'verify') {
    return <VerifyStep
      theme={theme}
      ui={ui}
      styles={styles}
      course={course}
      setCourse={setCourse}
      onBack={() => setStep('form')}
      onConfirm={confirmVerify}
      t={t}
    />;
  }

  if (step === 'review') {
    return <ReviewStep
      theme={theme}
      ui={ui}
      styles={styles}
      course={course}
      onBack={() =>
        setStep(course.scheduleStages && course.scheduleStages.length > 0 ? 'verify' : 'form')
      }
      onSave={save}
      reminderEnabled={reminderEnabled}
      toggleReminder={toggleReminder}
      setCourse={setCourse}
      t={t}
    />;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <ScreenEyebrow section={t('asit.eyebrow')} />
          <Text style={ui.docTitle}>{t('asit.courseTitle')}</Text>
          <Text style={ui.docMeta}>{t('asit.courseSubtitle')}</Text>
        </View>
      </View>

      <GlassCard style={styles.section}>
        {/* Allergen picker */}
        <Text style={ui.sectionLabel}>{t('asit.allergenLabel')}</Text>
        {course.allergenId ? (
          <View style={styles.allergenRow}>
            <Text style={styles.allergenName}>{course.allergen}</Text>
            <Pressable onPress={() => setCatalogOpen(true)}>
              <Text style={styles.allergenChange}>{t('asit.allergenChange')}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.catalogPickerBtn} onPress={() => setCatalogOpen(true)}>
            <Ionicons name="search" size={18} color={theme.colors.accent} />
            <Text style={styles.catalogPickerText}>{t('asit.allergenFromCatalog')}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </Pressable>
        )}

        {/* Drug */}
        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.drugLabel')}</Text>
        <TextInput
          style={styles.input}
          value={course.drug}
          onChangeText={(drug) => setCourse((prev) => ({ ...prev, drug }))}
          placeholder={t('asit.drugPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.dosageLabel')}</Text>
        <TextInput
          style={styles.input}
          value={course.dosage ?? ''}
          onChangeText={(dosage) => setCourse((prev) => ({ ...prev, dosage }))}
          placeholder={t('asit.dosagePlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
        />

        {/* Prescription upload — photo opens device camera (gallery optional), like Scanner */}
        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.uploadPrescription')}</Text>
        <View style={ui.toggleRow}>
          <Pressable
            style={[ui.toggle, course.prescriptionPhotoUri ? ui.toggleActive : null]}
            onPress={() => setCameraOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('asit.uploadPhoto')}
            testID="asit-course-photo">
            <Ionicons name="camera" size={15} color={course.prescriptionPhotoUri ? theme.colors.accent : theme.colors.textSecondary} />
            <Text style={[ui.toggleText, course.prescriptionPhotoUri ? ui.toggleTextActive : null]}>
              {course.prescriptionPhotoUri ? t('asit.uploadPhotoAttached') : t('asit.uploadPhoto')}
            </Text>
          </Pressable>
          <Pressable
            style={[ui.toggle, course.prescriptionDocUri ? ui.toggleActive : null]}
            onPress={() => void pickPdf()}
            accessibilityRole="button"
            accessibilityLabel={t('asit.uploadPdf')}
            testID="asit-course-pdf">
            <Ionicons name="document" size={15} color={course.prescriptionDocUri ? theme.colors.accent : theme.colors.textSecondary} />
            <Text style={[ui.toggleText, course.prescriptionDocUri ? ui.toggleTextActive : null]}>
              {course.prescriptionDocUri ? t('asit.uploadPdfAttached') : t('asit.uploadPdf')}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.ocrBtn}
          onPress={startRecognize}
          disabled={parsing}
          accessibilityRole="button"
          accessibilityLabel={t('asit.ocrParse')}
          testID="asit-course-ocr">
          <Ionicons name="scan-outline" size={18} color={theme.colors.accent} />
          <Text style={styles.ocrBtnText}>
            {parsing ? t('asit.ocrParsing') : t('asit.ocrParse')}
          </Text>
        </Pressable>
        {ocrHint ? <Text style={styles.ocrHint}>{ocrHint}</Text> : null}

        {/* Route */}
        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.routeLabel')}</Text>
        <View style={ui.toggleRow}>
          {ROUTES.map((route) => (
            <Pressable
              key={route}
              style={[ui.toggle, course.route === route && ui.toggleActive]}
              onPress={() => setCourse((prev) => ({ ...prev, route }))}>
              <Text style={[ui.toggleText, course.route === route && ui.toggleTextActive]}>
                {ASIT_ROUTE_LABELS[route]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Phase */}
        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.phaseLabel')}</Text>
        <View style={ui.toggleRow}>
          {PHASES.map((phase) => (
            <Pressable
              key={phase}
              style={[ui.toggle, course.phase === phase && ui.toggleActive]}
              onPress={() => setCourse((prev) => ({ ...prev, phase }))}>
              <Text style={[ui.toggleText, course.phase === phase && ui.toggleTextActive]}>
                {ASIT_PHASE_LABELS[phase]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Start / end dates */}
        <View style={[styles.fieldGap, styles.dateRow]}>
          <View style={styles.dateField}>
            <DateTimeField
              label={t('asit.startDateLabel')}
              value={course.startDate}
              onChange={(startDate) => setCourse((prev) => ({ ...prev, startDate }))}
              mode="date"
              minYear={2020}
            />
          </View>
          <View style={styles.dateField}>
            <DateTimeField
              label={t('asit.endDateLabel')}
              value={course.endDate ?? ''}
              onChange={(endDate) => setCourse((prev) => ({ ...prev, endDate }))}
              mode="date"
              minYear={2020}
            />
          </View>
        </View>

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.scheduleLabel')}</Text>
        <ScheduleLinesEditor
          lines={course.scheduleLines}
          notesFallback={course.scheduleNotes}
          placeholder={t('asit.schedulePlaceholder')}
          addRowLabel={t('asit.addScheduleRow')}
          onChange={setScheduleLines}
          testID="asit-schedule-lines"
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.stagesLabel')}</Text>
        <ScheduleStagesEditor
          stages={course.scheduleStages ?? []}
          doseLabel={t('asit.stageDose')}
          dosePlaceholder={t('asit.dosagePlaceholder')}
          addRowLabel={t('asit.addScheduleRow')}
          stageLabel={(index) => t('asit.stageLabel', { n: String(index + 1) })}
          fromLabel={t('asit.stageFrom')}
          toLabel={t('asit.stageTo')}
          onChange={(scheduleStages) =>
            setCourse((prev) => ({ ...prev, scheduleStages, verified: false }))
          }
          testID="asit-schedule-stages"
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.clinicalTitle')}</Text>
        {(
          [
            ['primaryDisease', 'asit.clinicalPrimary'],
            ['concomitantDisease', 'asit.clinicalConcomitant'],
            ['recommendations', 'asit.clinicalRecommendations'],
            ['diet', 'asit.clinicalDiet'],
            ['examPlan', 'asit.clinicalExamPlan'],
            ['other', 'asit.clinicalOther'],
          ] as const
        ).map(([key, labelKey]) => (
          <View key={key} style={styles.clinicalField}>
            <Text style={ui.sectionLabel}>{t(labelKey)}</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={course.clinicalDiagnosis?.[key] ?? ''}
              onChangeText={(value) => setClinicalField(key, value)}
              placeholder={t(labelKey)}
              placeholderTextColor={theme.colors.textMuted}
              multiline
              textAlignVertical="top"
              testID={`asit-clinical-${key}`}
            />
          </View>
        ))}
      </GlassCard>

      {/* If stages already parsed, show verify button */}
      {course.scheduleStages && course.scheduleStages.length > 0 && !course.verified ? (
        <Button
          label={t('asit.verifyTitle')}
          variant="secondary"
          block
          onPress={() => setStep('verify')}
        />
      ) : null}

      <Button
        label={t('asit.reviewTitle')}
        variant="primary"
        block
        disabled={!course.allergen.trim() || !course.drug.trim()}
        onPress={goToNextFromForm}
      />

      <Disclaimer>{t('asit.disclaimer')}</Disclaimer>

      {/* Allergen catalog modal */}
      <AllergenCatalogModal
        visible={catalogOpen}
        selected={course.allergenId ? [course.allergenId] : []}
        onClose={() => setCatalogOpen(false)}
        onApply={pickAllergen}
      />

      {/* OCR text input modal */}
      <Modal visible={parseTextOpen} transparent animationType="slide" onRequestClose={() => setParseTextOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setParseTextOpen(false)}>
                <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
              </Pressable>
              <Text style={styles.modalTitle}>{t('asit.ocrParse')}</Text>
              <Pressable onPress={() => void applyOcrOutcome(parseText)} disabled={parsing}>
                <Text style={[styles.modalDone, parsing && styles.modalDoneDisabled]}>
                  {parsing ? t('asit.ocrParsing') : t('common.done')}
                </Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.parseInput}
              value={parseText}
              onChangeText={setParseText}
              placeholder={t('asit.ocrManualPlaceholder')}
              placeholderTextColor={theme.colors.textMuted}
              multiline
              textAlignVertical="top"
              autoFocus
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

interface VerifyStepProps {
  theme: ReturnType<typeof useTheme>;
  ui: ReturnType<typeof useUiStyles>;
  styles: ReturnType<typeof createStyles>;
  course: AsitCourse;
  setCourse: React.Dispatch<React.SetStateAction<AsitCourse>>;
  onBack: () => void;
  onConfirm: () => void;
  t: (key: string, params?: Record<string, string>) => string;
}

function VerifyStep({ theme, ui, styles, course, setCourse, onBack, onConfirm, t }: VerifyStepProps) {
  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <ScreenEyebrow section={t('asit.eyebrow')} />
          <Text style={ui.docTitle}>{t('asit.verifyTitle')}</Text>
          <Text style={ui.docMeta}>{t('asit.verifySubtitle')}</Text>
        </View>
      </View>

      <GlassCard style={styles.section}>
        {(course.scheduleStages ?? []).length === 0 ? (
          <Text style={styles.hint}>{t('asit.verifyStagesEmpty')}</Text>
        ) : null}
        <ScheduleStagesEditor
          stages={course.scheduleStages ?? []}
          doseLabel={t('asit.stageDose')}
          dosePlaceholder={t('asit.dosagePlaceholder')}
          addRowLabel={t('asit.addScheduleRow')}
          stageLabel={(index) => t('asit.stageLabel', { n: String(index + 1) })}
          fromLabel={t('asit.stageFrom')}
          toLabel={t('asit.stageTo')}
          onChange={(scheduleStages) => setCourse((prev) => ({ ...prev, scheduleStages }))}
          testID="asit-verify-stages"
        />
      </GlassCard>

      <Button label={t('asit.verifyConfirm')} variant="primary" block onPress={onConfirm} />
    </Screen>
  );
}

interface ReviewStepProps {
  theme: ReturnType<typeof useTheme>;
  ui: ReturnType<typeof useUiStyles>;
  styles: ReturnType<typeof createStyles>;
  course: AsitCourse;
  setCourse: React.Dispatch<React.SetStateAction<AsitCourse>>;
  onBack: () => void;
  onSave: () => Promise<void>;
  reminderEnabled: boolean;
  toggleReminder: (enabled: boolean) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

function ReviewStep({ theme, ui, styles, course, setCourse, onBack, onSave, reminderEnabled, toggleReminder, t }: ReviewStepProps) {
  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <ScreenEyebrow section={t('asit.eyebrow')} />
          <Text style={ui.docTitle}>{t('asit.reviewTitle')}</Text>
        </View>
      </View>

      <GlassCard style={styles.section}>
        <Text style={ui.sectionLabel}>{t('asit.allergenLabel')}</Text>
        <Text style={styles.reviewValue}>{course.allergen || '—'}</Text>

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.drugLabel')}</Text>
        <Text style={styles.reviewValue}>{course.drug || '—'}</Text>

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.dosageLabel')}</Text>
        <Text style={styles.reviewValue}>{course.dosage?.trim() || '—'}</Text>

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.startDateLabel')}</Text>
        <Text style={styles.reviewValue}>{course.startDate || '—'}</Text>

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.endDateLabel')}</Text>
        <Text style={styles.reviewValue}>{course.endDate?.trim() || '—'}</Text>

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.scheduleLabel')}</Text>
        {normalizeScheduleLines(course.scheduleLines, course.scheduleNotes)
          .filter((line) => line.trim())
          .map((line, i) => (
            <Text key={`sched-${i}`} style={styles.stageRow}>
              {i + 1}. {line}
            </Text>
          ))}

        {course.scheduleStages && course.scheduleStages.length > 0 ? (
          <>
            <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.stagesLabel')}</Text>
            {course.scheduleStages.map((s, i) => (
              <Text key={i} style={styles.stageRow}>
                {i + 1}. {s.from} – {s.to}: {s.dose}
              </Text>
            ))}
          </>
        ) : null}

        {course.clinicalDiagnosis &&
        Object.values(course.clinicalDiagnosis).some((value) => value.trim()) ? (
          <>
            <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.clinicalTitle')}</Text>
            {(
              [
                ['primaryDisease', 'asit.clinicalPrimary'],
                ['concomitantDisease', 'asit.clinicalConcomitant'],
                ['recommendations', 'asit.clinicalRecommendations'],
                ['diet', 'asit.clinicalDiet'],
                ['examPlan', 'asit.clinicalExamPlan'],
                ['other', 'asit.clinicalOther'],
              ] as const
            ).map(([key, labelKey]) => {
              const value = course.clinicalDiagnosis?.[key]?.trim();
              if (!value) return null;
              return (
                <Text key={key} style={styles.stageRow}>
                  {t(labelKey)}: {value}
                </Text>
              );
            })}
          </>
        ) : null}

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.reminderLabel')}</Text>
        <View style={ui.toggleRow}>
          <Pressable
            style={[ui.toggle, reminderEnabled && ui.toggleActive]}
            onPress={() => toggleReminder(true)}>
            <Text style={[ui.toggleText, reminderEnabled && ui.toggleTextActive]}>
              {t('asit.reminderOn')}
            </Text>
          </Pressable>
          <Pressable
            style={[ui.toggle, !reminderEnabled && ui.toggleActive]}
            onPress={() => toggleReminder(false)}>
            <Text style={[ui.toggleText, !reminderEnabled && ui.toggleTextActive]}>
              {t('asit.reminderOff')}
            </Text>
          </Pressable>
        </View>

        {reminderEnabled ? (
          <View style={styles.reminderRow}>
            <View style={styles.reminderField}>
              <Text style={styles.reminderFieldLabel}>{t('asit.reminderHour')}</Text>
              <TextInput
                style={styles.input}
                value={String(course.reminderHour ?? DEFAULT_ASIT_REMINDER_HOUR)}
                onChangeText={(value) => {
                  const hour = Number(value.replace(/\D/g, ''));
                  if (!Number.isFinite(hour)) return;
                  setCourse((prev) => ({ ...prev, reminderHour: Math.min(23, Math.max(0, hour)) }));
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={styles.reminderField}>
              <Text style={styles.reminderFieldLabel}>{t('asit.reminderMinute')}</Text>
              <TextInput
                style={styles.input}
                value={String(course.reminderMinute ?? DEFAULT_ASIT_REMINDER_MINUTE)}
                onChangeText={(value) => {
                  const minute = Number(value.replace(/\D/g, ''));
                  if (!Number.isFinite(minute)) return;
                  setCourse((prev) => ({
                    ...prev,
                    reminderMinute: Math.min(59, Math.max(0, minute)),
                  }));
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <Text style={styles.reminderPreview}>
              {formatAsitReminderTime(
                course.reminderHour ?? DEFAULT_ASIT_REMINDER_HOUR,
                course.reminderMinute ?? DEFAULT_ASIT_REMINDER_MINUTE,
              )}
            </Text>
          </View>
        ) : (
          <Text style={styles.hint}>{t('asit.reminderHint')}</Text>
        )}
      </GlassCard>

      <Button label={t('asit.reviewConfirm')} variant="primary" block onPress={() => void onSave()} />
      <Disclaimer>{t('asit.disclaimer')}</Disclaimer>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
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
    section: { gap: 4, marginBottom: 12 },
    fieldGap: { marginTop: 12 },
    dateRow: { flexDirection: 'row', gap: 8 },
    dateField: { flex: 1 },
    clinicalField: { marginTop: 10, gap: 6 },
    input: {
      backgroundColor: colors.card,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.borderInput,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: fonts.sans,
      color: colors.text,
    },
    inputMultiline: { minHeight: 96, lineHeight: 22 },
    allergenRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
    allergenName: { flex: 1, fontFamily: fonts.sansSemiBold, fontSize: 15, fontWeight: '600', color: colors.text },
    allergenChange: { fontFamily: fonts.sansSemiBold, fontSize: 13, fontWeight: '600', color: colors.accent },
    catalogPickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    catalogPickerText: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary },
    ocrBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 6,
      backgroundColor: colors.accentLight,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    ocrBtnText: { fontFamily: fonts.sansSemiBold, fontSize: 14, fontWeight: '600', color: colors.accent },
    ocrHint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
      marginTop: 8,
    },
    reminderRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
    reminderField: { flex: 1, gap: 4 },
    reminderFieldLabel: { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted },
    reminderPreview: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      fontWeight: '600',
      color: colors.accent,
      paddingBottom: 12,
    },
    empty: {
      fontFamily: fonts.sans,
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 24,
    },
    hint: { fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
    stageCard: { gap: 8, marginBottom: 8 },
    stageLabel: { fontFamily: fonts.sansSemiBold, fontSize: 13, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    stageDateRow: { flexDirection: 'row', gap: 8 },
    stageRow: { fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
    reviewValue: { fontFamily: fonts.sansSemiBold, fontSize: 15, fontWeight: '600', color: colors.text },
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
    modalSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: 24,
      maxHeight: '70%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    modalTitle: { fontFamily: fonts.sans, fontSize: 15, fontWeight: '700', color: colors.text },
    modalCancel: { fontFamily: fonts.sans, fontSize: 15, color: colors.textSecondary },
    modalDone: { fontFamily: fonts.sans, fontSize: 15, fontWeight: '700', color: colors.accent },
    modalDoneDisabled: { opacity: 0.4 },
    parseInput: {
      flex: 1,
      margin: 16,
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.borderInput,
      padding: 12,
      fontSize: 14,
      fontFamily: fonts.sans,
      color: colors.text,
      minHeight: 120,
    },
  });
}
