import type { AsitScheduleStage } from '@allerguide/core';
import { Button } from '@/src/components/Button';
import { GlassCard } from '@/src/components/GlassCard';
import { ScheduleStagesEditor } from '@/src/components/ScheduleStagesEditor';
import { CourseEditorLayout } from '@/src/components/therapy/CourseEditorLayout';
import type { CourseEditorStyles } from '@/src/components/therapy/course-editor-styles';
import { Text } from 'react-native';

type Props = {
  styles: CourseEditorStyles;
  eyebrow: string;
  title: string;
  subtitle?: string;
  emptyHint?: string;
  confirmLabel: string;
  stages: AsitScheduleStage[];
  doseLabel: string;
  dosePlaceholder: string;
  addRowLabel: string;
  stageLabel: (index: number) => string;
  fromLabel: string;
  toLabel: string;
  testID: string;
  onChange: (stages: AsitScheduleStage[]) => void;
  onBack: () => void;
  onConfirm: () => void;
};

export function CourseVerifyStep({
  styles,
  eyebrow,
  title,
  subtitle,
  emptyHint,
  confirmLabel,
  stages,
  doseLabel,
  dosePlaceholder,
  addRowLabel,
  stageLabel,
  fromLabel,
  toLabel,
  testID,
  onChange,
  onBack,
  onConfirm,
}: Props) {
  return (
    <CourseEditorLayout
      styles={styles}
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      onBack={onBack}>
      <GlassCard style={styles.section}>
        {emptyHint && stages.length === 0 ? <Text style={styles.hint}>{emptyHint}</Text> : null}
        <ScheduleStagesEditor
          stages={stages}
          doseLabel={doseLabel}
          dosePlaceholder={dosePlaceholder}
          addRowLabel={addRowLabel}
          stageLabel={stageLabel}
          fromLabel={fromLabel}
          toLabel={toLabel}
          onChange={onChange}
          testID={testID}
        />
      </GlassCard>
      <Button label={confirmLabel} variant="primary" block onPress={onConfirm} />
    </CourseEditorLayout>
  );
}
