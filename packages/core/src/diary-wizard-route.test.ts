import { describe, expect, it } from 'vitest';
import { DIARY_SECTIONS } from './diary';
import {
  FULL_WIZARD_EXCLUDED_SECTION_TYPES,
  FULL_WIZARD_HIDDEN_STEP_IDS,
  attachDiaryAutoMetadata,
  buildAdaptiveDiaryWizardSections,
} from './diary-wizard-route';

describe('diary-wizard-route', () => {
  it('drops dedicated modules and hidden auto/duplicate steps from the full wizard', () => {
    const route = buildAdaptiveDiaryWizardSections(DIARY_SECTIONS);
    const types = route.map((section) => section.type);
    expect(types).not.toContain('Пикфлоуметрия');
    expect(types).not.toContain('АСИТ');
    expect(types).not.toContain('Визит к врачу');
    expect(types).not.toContain('Терапия');
    expect(types).toContain('Симптомы');
    expect(types).toContain('Лекарство');

    const stepIds = route.flatMap((section) => section.steps.map((step) => step.id));
    for (const hidden of FULL_WIZARD_HIDDEN_STEP_IDS) {
      expect(stepIds).not.toContain(hidden);
    }
    expect(stepIds).toContain('takenAt');
    expect(FULL_WIZARD_EXCLUDED_SECTION_TYPES.size).toBe(4);
  });

  it('fills missing auto metadata without overwriting user answers', () => {
    const merged = attachDiaryAutoMetadata(
      { pollenContext: 'уже есть' },
      { pollenContext: 'новое', todayMeds: 'цетиризин' },
    );
    expect(merged.pollenContext).toBe('уже есть');
    expect(merged.todayMeds).toBe('цетиризин');
  });
});
