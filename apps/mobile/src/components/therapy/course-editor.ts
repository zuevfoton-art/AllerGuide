import {
  filterFilledScheduleStages,
  normalizeScheduleLines,
  scheduleLinesToNotes,
  type ScheduleStageLike,
} from '@allerguide/core';

export type CourseEditorStep = 'form' | 'verify' | 'review';

export type PrescriptionCopyPrefix = 'asit' | 'prescribedTherapy';

export type CourseScheduleFields = {
  scheduleLines?: string[];
  scheduleNotes: string;
};

export function applyCourseScheduleLines<T extends CourseScheduleFields>(
  prev: T,
  scheduleLines: string[],
): T {
  const lines = normalizeScheduleLines(scheduleLines);
  return {
    ...prev,
    scheduleLines: lines,
    scheduleNotes: scheduleLinesToNotes(lines),
  } as T;
}

export function nextCourseEditorStep(options: {
  canLeaveForm: boolean;
  filledStageCount: number;
  verified: boolean;
}): CourseEditorStep | null {
  if (!options.canLeaveForm) return null;
  if (options.filledStageCount > 0 && !options.verified) return 'verify';
  return 'review';
}

export function backFromReviewStep(filledStageCount: number): CourseEditorStep {
  return filledStageCount > 0 ? 'verify' : 'form';
}

export function countFilledStages(stages: ScheduleStageLike[] | null | undefined): number {
  return filterFilledScheduleStages(stages).length;
}

/** No attached photo/PDF → open the manual text sheet instead of calling OCR. */
export function shouldOpenManualParse(hasPhoto: boolean, hasPdf: boolean): boolean {
  return !hasPhoto && !hasPdf;
}

/** Cloud OCR produced text but no structured drug — keep the paste sheet open. */
export function shouldKeepOcrTextModal(hintCode: string | undefined, text: string): boolean {
  return hintCode === 'fields_incomplete' && Boolean(text.trim());
}
