import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ASIT_PHASE_LABELS,
  ASIT_ROUTE_LABELS,
  DEFAULT_ASIT_REMINDER_HOUR,
  DEFAULT_ASIT_REMINDER_MINUTE,
  createEmptyAsitClinicalDiagnosis,
  filterFilledScheduleStages,
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
import { AllergenCatalogModal } from '@/src/components/AllergenCatalogModal';
import { Button } from '@/src/components/Button';
import { DateTimeField } from '@/src/components/DateTimeField';
import { Disclaimer } from '@/src/components/Disclaimer';
import { GlassCard } from '@/src/components/GlassCard';
import { ScheduleLinesEditor } from '@/src/components/ScheduleLinesEditor';
import { ScheduleStagesEditor } from '@/src/components/ScheduleStagesEditor';
import { CourseEditorLayout } from '@/src/components/therapy/CourseEditorLayout';
import { CourseReviewSummary } from '@/src/components/therapy/CourseReviewSummary';
import { CourseVerifyStep } from '@/src/components/therapy/CourseVerifyStep';
import { PrescriptionImportModals } from '@/src/components/therapy/PrescriptionImportModals';
import { PrescriptionImportPanel } from '@/src/components/therapy/PrescriptionImportPanel';
import {
  applyCourseScheduleLines,
  backFromReviewStep,
  countFilledStages,
  nextCourseEditorStep,
  type CourseEditorStep,
} from '@/src/components/therapy/course-editor';
import { createCourseEditorStyles } from '@/src/components/therapy/course-editor-styles';
import { useAppStore } from '@/src/store/app-store';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { usePrescriptionParser } from '@/src/hooks/use-prescription-parser';
import { useTheme } from '@/src/hooks/use-theme';
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

const ROUTES: AsitRoute[] = ['slit', 'scit'];
const PHASES: AsitPhase[] = ['buildup', 'maintenance'];

const CLINICAL_FIELDS = [
  ['primaryDisease', 'asit.clinicalPrimary'],
  ['concomitantDisease', 'asit.clinicalConcomitant'],
  ['recommendations', 'asit.clinicalRecommendations'],
  ['diet', 'asit.clinicalDiet'],
  ['examPlan', 'asit.clinicalExamPlan'],
  ['other', 'asit.clinicalOther'],
] as const;

export default function AsitCourseScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createCourseEditorStyles(theme), [theme]);
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.activeProfile);
  const profileId = profile?.id;
  const [course, setCourse] = useState<AsitCourse>(() => createEmptyAsitCourse());
  const [step, setStep] = useState<CourseEditorStep>('form');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const parser = usePrescriptionParser({
    course,
    setCourse,
    applyParse: applyPrescriptionParseToAsitCourse,
    copyPrefix: 'asit',
  });

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

  const pickAllergen = useCallback((ids: string[]) => {
    const id = ids[0];
    if (!id) return;
    const name = findAllergenById(id)?.name ?? id;
    setCourse((prev) => ({ ...prev, allergen: name, allergenId: id }));
  }, []);

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

  const confirmVerify = () => {
    setCourse((prev) => ({ ...prev, verified: true }));
    setStep('review');
  };

  const save = async () => {
    if (!profileId) return;
    const lines = normalizeScheduleLines(course.scheduleLines, course.scheduleNotes);
    const scheduleStages = filterFilledScheduleStages(course.scheduleStages);
    const toSave: AsitCourse = {
      ...course,
      scheduleLines: lines,
      scheduleNotes: scheduleLinesToNotes(lines),
      scheduleStages,
      verified: scheduleStages.length ? Boolean(course.verified) : true,
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
    const next = nextCourseEditorStep({
      canLeaveForm: Boolean(course.allergen.trim() && course.drug.trim()),
      filledStageCount: countFilledStages(course.scheduleStages),
      verified: Boolean(course.verified),
    });
    if (next) setStep(next);
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
      <CourseEditorLayout
        styles={styles}
        title={t('asit.noProfile')}
        emptyMessage={t('asit.noProfile')}
        onBack={() => router.back()}
      />
    );
  }

  if (parser.cameraOpen) {
    return (
      <PrescriptionImportModals
        copyPrefix="asit"
        styles={styles}
        theme={theme}
        cameraOpen
        parseTextOpen={false}
        parseText={parser.parseText}
        parsing={parser.parsing}
        onCancelCamera={() => parser.setCameraOpen(false)}
        onCaptured={parser.onPhotoCaptured}
        onCloseParse={() => parser.setParseTextOpen(false)}
        onChangeParseText={parser.setParseText}
        onSubmitParse={() => void parser.applyOcrOutcome(parser.parseText)}
      />
    );
  }

  if (!asitEnabled) {
    return (
      <CourseEditorLayout styles={styles} title={t('asit.courseTitle')} onBack={() => router.back()}>
        <GlassCard>
          <Text style={styles.hint}>{t('asit.notEligible')}</Text>
        </GlassCard>
      </CourseEditorLayout>
    );
  }

  if (step === 'verify') {
    return (
      <CourseVerifyStep
        styles={styles}
        eyebrow={t('asit.eyebrow')}
        title={t('asit.verifyTitle')}
        subtitle={t('asit.verifySubtitle')}
        emptyHint={t('asit.verifyStagesEmpty')}
        confirmLabel={t('asit.verifyConfirm')}
        stages={course.scheduleStages ?? []}
        doseLabel={t('asit.stageDose')}
        dosePlaceholder={t('asit.dosagePlaceholder')}
        addRowLabel={t('asit.addScheduleRow')}
        stageLabel={(index) => t('asit.stageLabel', { n: String(index + 1) })}
        fromLabel={t('asit.stageFrom')}
        toLabel={t('asit.stageTo')}
        testID="asit-verify-stages"
        onChange={(scheduleStages) => setCourse((prev) => ({ ...prev, scheduleStages }))}
        onBack={() => setStep('form')}
        onConfirm={confirmVerify}
      />
    );
  }

  if (step === 'review') {
    return (
      <CourseEditorLayout
        styles={styles}
        eyebrow={t('asit.eyebrow')}
        title={t('asit.reviewTitle')}
        onBack={() => setStep(backFromReviewStep(countFilledStages(course.scheduleStages)))}>
        <GlassCard style={styles.section}>
          <CourseReviewSummary
            styles={styles}
            fields={[
              { label: t('asit.allergenLabel'), value: course.allergen },
              { label: t('asit.drugLabel'), value: course.drug },
              { label: t('asit.dosageLabel'), value: course.dosage?.trim() ?? '' },
              { label: t('asit.startDateLabel'), value: course.startDate },
              { label: t('asit.endDateLabel'), value: course.endDate?.trim() ?? '' },
            ]}
            scheduleLabel={t('asit.scheduleLabel')}
            scheduleLines={course.scheduleLines}
            scheduleNotes={course.scheduleNotes}
            stagesLabel={t('asit.stagesLabel')}
            stages={course.scheduleStages}>
            {course.clinicalDiagnosis &&
            Object.values(course.clinicalDiagnosis).some((value) => value.trim()) ? (
              <>
                <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('asit.clinicalTitle')}</Text>
                {CLINICAL_FIELDS.map(([key, labelKey]) => {
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
              <DateTimeField
                label={t('asit.reminderTime')}
                mode="time"
                placeholder={t('diary.timePlaceholder')}
                value={formatAsitReminderTime(
                  course.reminderHour ?? DEFAULT_ASIT_REMINDER_HOUR,
                  course.reminderMinute ?? DEFAULT_ASIT_REMINDER_MINUTE,
                )}
                onChange={(time) => {
                  const [hourText, minuteText] = time.split(':');
                  const hour = Number(hourText);
                  const minute = Number(minuteText);
                  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return;
                  setCourse((prev) => ({
                    ...prev,
                    reminderHour: Math.min(23, Math.max(0, hour)),
                    reminderMinute: Math.min(59, Math.max(0, minute)),
                  }));
                }}
                testID="asit-reminder-time"
              />
            ) : (
              <Text style={styles.hint}>{t('asit.reminderHint')}</Text>
            )}
          </CourseReviewSummary>
        </GlassCard>
        <Button label={t('asit.reviewConfirm')} variant="primary" block onPress={() => void save()} />
      </CourseEditorLayout>
    );
  }

  return (
    <CourseEditorLayout
      styles={styles}
      title={t('asit.courseTitle')}
      subtitle={t('asit.courseSubtitle')}
      onBack={() => router.back()}>
      <GlassCard style={styles.section}>
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

        <PrescriptionImportPanel
          copyPrefix="asit"
          styles={styles}
          theme={theme}
          variant="toggle"
          testIDPrefix="asit-course"
          hasPhoto={Boolean(course.prescriptionPhotoUri)}
          hasPdf={Boolean(course.prescriptionDocUri)}
          parsing={parser.parsing}
          ocrHint={parser.ocrHint}
          onOpenCamera={() => parser.setCameraOpen(true)}
          onPickPdf={() => void parser.pickPdf()}
          onRecognize={parser.startRecognize}
        />

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
          onChange={(lines) => setCourse((prev) => applyCourseScheduleLines(prev, lines))}
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
        {CLINICAL_FIELDS.map(([key, labelKey]) => (
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

      {countFilledStages(course.scheduleStages) > 0 && !course.verified ? (
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
        disabled={!course.allergen.trim() || !course.drug.trim() || !course.startDate.trim()}
        onPress={goToNextFromForm}
      />

      <Disclaimer>{t('asit.disclaimer')}</Disclaimer>

      <AllergenCatalogModal
        visible={catalogOpen}
        selected={course.allergenId ? [course.allergenId] : []}
        onClose={() => setCatalogOpen(false)}
        onApply={pickAllergen}
      />

      <PrescriptionImportModals
        copyPrefix="asit"
        styles={styles}
        theme={theme}
        cameraOpen={false}
        parseTextOpen={parser.parseTextOpen}
        parseText={parser.parseText}
        parsing={parser.parsing}
        onCancelCamera={() => parser.setCameraOpen(false)}
        onCaptured={parser.onPhotoCaptured}
        onCloseParse={() => parser.setParseTextOpen(false)}
        onChangeParseText={parser.setParseText}
        onSubmitParse={() => void parser.applyOcrOutcome(parser.parseText)}
      />
    </CourseEditorLayout>
  );
}
