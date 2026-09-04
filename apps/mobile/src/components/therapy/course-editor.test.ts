import { describe, expect, it } from 'vitest';
import {
  applyCourseScheduleLines,
  backFromReviewStep,
  countFilledStages,
  nextCourseEditorStep,
  shouldKeepOcrTextModal,
  shouldOpenManualParse,
} from './course-editor';
import { prescriptionOcrHintMessage } from './prescription-ocr-copy';

describe('nextCourseEditorStep', () => {
  it('stays on form when required fields are missing', () => {
    expect(
      nextCourseEditorStep({ canLeaveForm: false, filledStageCount: 2, verified: false }),
    ).toBeNull();
  });

  it('goes to verify when stages exist and are unverified', () => {
    expect(
      nextCourseEditorStep({ canLeaveForm: true, filledStageCount: 1, verified: false }),
    ).toBe('verify');
  });

  it('skips verify when there are no stages or they are already verified', () => {
    expect(
      nextCourseEditorStep({ canLeaveForm: true, filledStageCount: 0, verified: false }),
    ).toBe('review');
    expect(
      nextCourseEditorStep({ canLeaveForm: true, filledStageCount: 2, verified: true }),
    ).toBe('review');
  });
});

describe('backFromReviewStep / countFilledStages', () => {
  it('returns verify only when filled stages exist', () => {
    expect(backFromReviewStep(0)).toBe('form');
    expect(backFromReviewStep(1)).toBe('verify');
  });

  it('ignores blank stage rows', () => {
    expect(
      countFilledStages([
        { from: '', to: '', dose: '' },
        { from: '2026-01-01', to: '2026-02-01', dose: '5 кап' },
      ]),
    ).toBe(1);
  });
});

describe('shouldOpenManualParse / shouldKeepOcrTextModal', () => {
  it('opens manual parse only when there is no attached media', () => {
    expect(shouldOpenManualParse(false, false)).toBe(true);
    expect(shouldOpenManualParse(true, false)).toBe(false);
    expect(shouldOpenManualParse(false, true)).toBe(false);
  });

  it('keeps the paste sheet open when fields are incomplete and text exists', () => {
    expect(shouldKeepOcrTextModal('fields_incomplete', '  Зиртек  ')).toBe(true);
    expect(shouldKeepOcrTextModal('fields_incomplete', '   ')).toBe(false);
    expect(shouldKeepOcrTextModal('demo', 'Зиртек')).toBe(false);
  });
});

describe('applyCourseScheduleLines', () => {
  it('normalizes lines and mirrors notes', () => {
    const next = applyCourseScheduleLines(
      { scheduleLines: [''], scheduleNotes: '' },
      ['утро  ', '', 'вечер'],
    );
    expect(next.scheduleLines).toEqual(['утро', 'вечер']);
    expect(next.scheduleNotes).toBe('утро\nвечер');
  });
});

describe('prescriptionOcrHintMessage', () => {
  const t = (key: string, params?: Record<string, string>) =>
    params?.error ? `${key}:${params.error}` : key;

  it('returns null without a hint code', () => {
    expect(prescriptionOcrHintMessage(t, 'asit', undefined)).toBeNull();
  });

  it('maps codes to the copy prefix and interpolates cloud errors', () => {
    expect(prescriptionOcrHintMessage(t, 'asit', 'demo')).toBe('asit.ocrDemoHint');
    expect(prescriptionOcrHintMessage(t, 'prescribedTherapy', 'parse_error')).toBe(
      'prescribedTherapy.ocrParseError',
    );
    expect(prescriptionOcrHintMessage(t, 'asit', 'cloud_failed', 'HTTP 503')).toBe(
      'asit.ocrCloudFailed:HTTP 503',
    );
    expect(prescriptionOcrHintMessage(t, 'asit', 'cloud_failed')).toBe('asit.ocrCloudFailed:error');
  });
});
