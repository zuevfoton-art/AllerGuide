import { describe, expect, it } from 'vitest';
import { buildClinicalScaleEditorState } from '@/src/services/diary-section-service';

describe('buildClinicalScaleEditorState', () => {
  it('returns a Шкала section with the selected scale prefilled', () => {
    const state = buildClinicalScaleEditorState('act');
    expect(state.sectionType).toBe('Шкала');
    expect(state.section?.type).toBe('Шкала');
    expect(state.prefill?.Шкала).toEqual({ scaleId: 'act' });
    expect(state.section?.steps.some((step) => step.id === 'actActivity')).toBe(true);
  });
});
