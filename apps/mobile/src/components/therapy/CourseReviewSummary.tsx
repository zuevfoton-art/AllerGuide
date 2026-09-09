import { Text } from 'react-native';
import {
  filterFilledScheduleStages,
  normalizeScheduleLines,
  type ScheduleStageLike,
} from '@allerguide/core';
import type { CourseEditorStyles } from '@/src/components/therapy/course-editor-styles';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import type { ReactNode } from 'react';

export type CourseReviewField = {
  label: string;
  value: string;
};

type Props = {
  styles: CourseEditorStyles;
  fields: CourseReviewField[];
  scheduleLabel: string;
  scheduleLines?: string[];
  scheduleNotes?: string;
  stagesLabel: string;
  stages: ScheduleStageLike[] | null | undefined;
  children?: ReactNode;
};

export function CourseReviewSummary({
  styles,
  fields,
  scheduleLabel,
  scheduleLines,
  scheduleNotes,
  stagesLabel,
  stages,
  children,
}: Props) {
  const ui = useUiStyles();
  const filledStages = filterFilledScheduleStages(stages);
  const lines = normalizeScheduleLines(scheduleLines, scheduleNotes).filter((line) => line.trim());

  return (
    <>
      {fields.map((field, index) => (
        <ViewBlock key={field.label} first={index === 0} styles={styles} label={field.label} ui={ui}>
          <Text style={styles.reviewValue}>{field.value || '—'}</Text>
        </ViewBlock>
      ))}

      <ViewBlock styles={styles} label={scheduleLabel} ui={ui}>
        {lines.map((line, i) => (
          <Text key={`sched-${i}`} style={styles.stageRow}>
            {i + 1}. {line}
          </Text>
        ))}
      </ViewBlock>

      {filledStages.length > 0 ? (
        <ViewBlock styles={styles} label={stagesLabel} ui={ui}>
          {filledStages.map((stage, i) => (
            <Text key={`stage-${i}`} style={styles.stageRow}>
              {i + 1}. {stage.from} – {stage.to}: {stage.dose}
            </Text>
          ))}
        </ViewBlock>
      ) : null}

      {children}
    </>
  );
}

function ViewBlock({
  first,
  styles,
  label,
  ui,
  children,
}: {
  first?: boolean;
  styles: CourseEditorStyles;
  label: string;
  ui: ReturnType<typeof useUiStyles>;
  children: ReactNode;
}) {
  return (
    <>
      <Text style={first ? ui.sectionLabel : [ui.sectionLabel, styles.fieldGap]}>{label}</Text>
      {children}
    </>
  );
}
