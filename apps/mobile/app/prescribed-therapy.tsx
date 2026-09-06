import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useMemo, useState, useEffect } from 'react';
import {
  MAX_PRESCRIBED_REMINDER_TIMES,
  addPrescribedReminderTime,
  filterFilledScheduleStages,
  getPrescribedReminderTimes,
  isPrescribedReminderConfigured,
  normalizeScheduleLines,
  PRESCRIBED_THERAPY_ROUTE_LABELS,
  removePrescribedReminderTimeAt,
  scheduleLinesToNotes,
  setPrescribedReminderEnabled,
  updatePrescribedReminderTimeAt,
  type PrescribedCourse,
  type PrescribedTherapyRoute,
} from '@allerguide/core';
import { applyPrescriptionParseToCourse } from '@allerguide/ai';
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
  createEmptyPrescribedCourse,
  getPrescribedCourse,
  savePrescribedCourse,
} from '@/src/services/prescribed-therapy-service';

const ROUTES = Object.keys(PRESCRIBED_THERAPY_ROUTE_LABELS) as PrescribedTherapyRoute[];

export default function PrescribedTherapyScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createCourseEditorStyles(theme), [theme]);
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.activeProfile);
  const profileId = profile?.id;
  const [course, setCourse] = useState<PrescribedCourse>(() => createEmptyPrescribedCourse());
  const [step, setStep] = useState<CourseEditorStep>('form');
  const parser = usePrescriptionParser({
    course,
    setCourse,
    applyParse: applyPrescriptionParseToCourse,
    copyPrefix: 'prescribedTherapy',
  });

  useEffect(() => {
    if (!profileId) return;
    const existing = getPrescribedCourse(profileId);
    if (existing) setCourse(existing);
  }, [profileId]);

  const confirmVerify = () => {
    setCourse((prev) => ({ ...prev, verified: true }));
    setStep('review');
  };

  const save = async () => {
    if (!profileId) return;
    const lines = normalizeScheduleLines(course.scheduleLines, course.scheduleNotes);
    const stages = filterFilledScheduleStages(course.stages);
    const toSave: PrescribedCourse = {
      ...course,
      scheduleLines: lines,
      scheduleNotes: scheduleLinesToNotes(lines),
      stages,
      verified: stages.length ? Boolean(course.verified) : true,
      activated: true,
      active: true,
    };
    savePrescribedCourse(profileId, toSave);
    router.back();
  };

  const goToNextFromForm = () => {
    const next = nextCourseEditorStep({
      canLeaveForm: Boolean(course.drug.trim()),
      filledStageCount: countFilledStages(course.stages),
      verified: Boolean(course.verified),
    });
    if (next) setStep(next);
  };

  const reminderEnabled = isPrescribedReminderConfigured(course);
  const reminderTimes = getPrescribedReminderTimes(course);

  if (!profile) {
    return (
      <CourseEditorLayout
        styles={styles}
        title={t('prescribedTherapy.noProfile')}
        emptyMessage={t('prescribedTherapy.noProfile')}
        onBack={() => router.back()}
      />
    );
  }

  if (parser.cameraOpen) {
    return (
      <PrescriptionImportModals
        copyPrefix="prescribedTherapy"
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

  if (step === 'verify') {
    return (
      <CourseVerifyStep
        styles={styles}
        eyebrow={t('prescribedTherapy.eyebrow')}
        title={t('prescribedTherapy.verifyTitle')}
        confirmLabel={t('prescribedTherapy.verifyConfirm')}
        stages={course.stages ?? []}
        doseLabel={t('prescribedTherapy.stageDose')}
        dosePlaceholder={t('prescribedTherapy.dosagePlaceholder')}
        addRowLabel={t('prescribedTherapy.addScheduleRow')}
        stageLabel={(index) => t('prescribedTherapy.stageLabel', { n: String(index + 1) })}
        fromLabel={t('prescribedTherapy.stageFrom')}
        toLabel={t('prescribedTherapy.stageTo')}
        testID="prescribed-verify-stages"
        onChange={(stages) => setCourse((prev) => ({ ...prev, stages }))}
        onBack={() => setStep('form')}
        onConfirm={confirmVerify}
      />
    );
  }

  if (step === 'review') {
    return (
      <CourseEditorLayout
        styles={styles}
        eyebrow={t('prescribedTherapy.eyebrow')}
        title={t('prescribedTherapy.reviewTitle')}
        onBack={() => setStep(backFromReviewStep(countFilledStages(course.stages)))}>
        <GlassCard style={styles.section}>
          <CourseReviewSummary
            styles={styles}
            fields={[
              { label: t('prescribedTherapy.drugLabel'), value: course.drug },
              { label: t('prescribedTherapy.dosageLabel'), value: course.dosage },
              { label: t('prescribedTherapy.startDateLabel'), value: course.startDate },
              { label: t('prescribedTherapy.endDateLabel'), value: course.endDate },
            ]}
            scheduleLabel={t('prescribedTherapy.scheduleLabel')}
            scheduleLines={course.scheduleLines}
            scheduleNotes={course.scheduleNotes}
            stagesLabel={t('prescribedTherapy.stagesLabel')}
            stages={course.stages}>
            <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('prescribedTherapy.reminderLabel')}</Text>
            <View style={ui.toggleRow}>
              <Pressable
                style={[ui.toggle, reminderEnabled && ui.toggleActive]}
                onPress={() => setCourse((prev) => setPrescribedReminderEnabled(prev, true))}>
                <Text style={[ui.toggleText, reminderEnabled && ui.toggleTextActive]}>
                  {t('prescribedTherapy.reminderOn')}
                </Text>
              </Pressable>
              <Pressable
                style={[ui.toggle, !reminderEnabled && ui.toggleActive]}
                onPress={() => setCourse((prev) => setPrescribedReminderEnabled(prev, false))}>
                <Text style={[ui.toggleText, !reminderEnabled && ui.toggleTextActive]}>
                  {t('prescribedTherapy.reminderOff')}
                </Text>
              </Pressable>
            </View>

            {reminderEnabled ? (
              <View style={styles.reminderList} testID="prescribed-reminder-times">
                {reminderTimes.map((time, index) => (
                  <View
                    key={`reminder-${index}`}
                    style={styles.reminderRow}
                    testID={`prescribed-reminder-row-${index}`}>
                    <View style={styles.reminderField}>
                      <DateTimeField
                        label={t('prescribedTherapy.reminderTime')}
                        value={`${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`}
                        mode="time"
                        onChange={(value) => {
                          const match = value.match(/(\d{1,2}):(\d{2})/);
                          if (!match) return;
                          setCourse((prev) =>
                            updatePrescribedReminderTimeAt(prev, index, {
                              hour: Number(match[1]),
                              minute: Number(match[2]),
                            }),
                          );
                        }}
                      />
                    </View>
                    {reminderTimes.length > 1 ? (
                      <Pressable
                        style={styles.reminderIconBtn}
                        onPress={() => setCourse((prev) => removePrescribedReminderTimeAt(prev, index))}
                        accessibilityRole="button"
                        accessibilityLabel={t('prescribedTherapy.removeReminderTime')}
                        testID={`prescribed-reminder-remove-${index}`}>
                        <Ionicons name="close" size={20} color={theme.colors.textMuted} />
                      </Pressable>
                    ) : (
                      <View style={styles.reminderIconBtnSpacer} />
                    )}
                  </View>
                ))}
                {reminderTimes.length < MAX_PRESCRIBED_REMINDER_TIMES ? (
                  <Pressable
                    style={styles.addReminderBtn}
                    onPress={() => setCourse((prev) => addPrescribedReminderTime(prev))}
                    accessibilityRole="button"
                    accessibilityLabel={t('prescribedTherapy.addReminderTime')}
                    testID="prescribed-reminder-add">
                    <Ionicons name="add" size={18} color={theme.colors.accent} />
                    <Text style={styles.addReminderText}>{t('prescribedTherapy.addReminderTime')}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <Text style={styles.hint}>{t('prescribedTherapy.reminderHint')}</Text>
            )}
          </CourseReviewSummary>
        </GlassCard>
        <Button
          label={t('prescribedTherapy.reviewConfirm')}
          variant="primary"
          block
          onPress={() => void save()}
        />
      </CourseEditorLayout>
    );
  }

  return (
    <CourseEditorLayout
      styles={styles}
      title={t('prescribedTherapy.courseTitle')}
      subtitle={t('prescribedTherapy.courseSubtitle')}
      onBack={() => router.back()}>
      <GlassCard style={styles.section}>
        <PrescriptionImportPanel
          copyPrefix="prescribedTherapy"
          styles={styles}
          theme={theme}
          variant="chip"
          testIDPrefix="prescribed-therapy"
          hasPhoto={Boolean(course.prescriptionPhotoUri)}
          hasPdf={Boolean(course.prescriptionDocUri)}
          parsing={parser.parsing}
          ocrHint={parser.ocrHint}
          onOpenCamera={() => parser.setCameraOpen(true)}
          onPickPdf={() => void parser.pickPdf()}
          onRecognize={parser.startRecognize}
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('prescribedTherapy.drugLabel')}</Text>
        <TextInput
          style={styles.input}
          value={course.drug}
          onChangeText={(drug) => setCourse((prev) => ({ ...prev, drug }))}
          placeholder={t('prescribedTherapy.drugPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('prescribedTherapy.dosageLabel')}</Text>
        <TextInput
          style={styles.input}
          value={course.dosage}
          onChangeText={(dosage) => setCourse((prev) => ({ ...prev, dosage }))}
          placeholder={t('prescribedTherapy.dosagePlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('prescribedTherapy.routeLabel')}</Text>
        <View style={styles.routeBubbles}>
          {ROUTES.map((route) => {
            const active = course.route === route;
            return (
              <Pressable
                key={route}
                style={[styles.routeBubble, active && styles.routeBubbleActive]}
                onPress={() => setCourse((prev) => ({ ...prev, route }))}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={PRESCRIBED_THERAPY_ROUTE_LABELS[route]}>
                <Text style={[styles.routeBubbleText, active && styles.routeBubbleTextActive]}>
                  {PRESCRIBED_THERAPY_ROUTE_LABELS[route]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.fieldGap, styles.dateRow]}>
          <View style={styles.dateField}>
            <DateTimeField
              label={t('prescribedTherapy.startDateLabel')}
              value={course.startDate}
              onChange={(startDate) => setCourse((prev) => ({ ...prev, startDate }))}
              mode="date"
              minYear={2020}
            />
          </View>
          <View style={styles.dateField}>
            <DateTimeField
              label={t('prescribedTherapy.endDateLabel')}
              value={course.endDate}
              onChange={(endDate) => setCourse((prev) => ({ ...prev, endDate }))}
              mode="date"
              minYear={2020}
            />
          </View>
        </View>

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('prescribedTherapy.scheduleLabel')}</Text>
        <ScheduleLinesEditor
          lines={course.scheduleLines}
          notesFallback={course.scheduleNotes}
          placeholder={t('prescribedTherapy.schedulePlaceholder')}
          addRowLabel={t('prescribedTherapy.addScheduleRow')}
          onChange={(lines) => setCourse((prev) => applyCourseScheduleLines(prev, lines))}
          testID="prescribed-schedule-lines"
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('prescribedTherapy.stagesLabel')}</Text>
        <ScheduleStagesEditor
          stages={course.stages ?? []}
          doseLabel={t('prescribedTherapy.stageDose')}
          dosePlaceholder={t('prescribedTherapy.dosagePlaceholder')}
          addRowLabel={t('prescribedTherapy.addScheduleRow')}
          stageLabel={(index) => t('prescribedTherapy.stageLabel', { n: String(index + 1) })}
          fromLabel={t('prescribedTherapy.stageFrom')}
          toLabel={t('prescribedTherapy.stageTo')}
          onChange={(stages) => setCourse((prev) => ({ ...prev, stages, verified: false }))}
          testID="prescribed-schedule-stages"
        />

        <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('prescribedTherapy.notesLabel')}</Text>
        <TextInput
          style={[styles.input, styles.inputMultilineCompact]}
          value={course.notes}
          onChangeText={(notes) => setCourse((prev) => ({ ...prev, notes }))}
          placeholder={t('prescribedTherapy.notesPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          textAlignVertical="top"
        />
      </GlassCard>

      {countFilledStages(course.stages) > 0 && !course.verified ? (
        <Button
          label={t('prescribedTherapy.verifyTitle')}
          variant="secondary"
          block
          onPress={() => setStep('verify')}
        />
      ) : null}

      <Button
        label={t('prescribedTherapy.reviewTitle')}
        variant="primary"
        block
        disabled={!course.drug.trim()}
        onPress={goToNextFromForm}
      />

      <Disclaimer compact>{t('prescribedTherapy.disclaimerShort')}</Disclaimer>

      <PrescriptionImportModals
        copyPrefix="prescribedTherapy"
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
