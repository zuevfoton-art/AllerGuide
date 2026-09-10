import { describe, expect, it } from 'vitest';
import { DIARY_SECTIONS } from './diary';
import {
  FULL_WIZARD_EXCLUDED_SECTION_TYPES,
  FULL_WIZARD_HIDDEN_STEP_IDS,
  attachDiaryAutoMetadata,
  buildAdaptiveDiaryWizardSections,
  hideDiaryAutoSteps,
} from './diary-wizard-route';
import { getDiarySection } from './diary-schema';

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
    expect(stepIds).not.toContain('foodSource');
    const nutrition = route.find((section) => section.type === 'Питание');
    expect(nutrition?.steps.map((step) => step.id)).toEqual([
      'food',
      'foodComponents',
      'reaction',
      'reactionType',
    ]);
    expect(FULL_WIZARD_EXCLUDED_SECTION_TYPES.size).toBe(4);
  });

  it('hides auto steps of a single section wizard', () => {
    const nutrition = getDiarySection('Питание');
    expect(nutrition).toBeTruthy();
    const stepIds = hideDiaryAutoSteps(nutrition!).steps.map((step) => step.id);
    expect(stepIds).toEqual(['food', 'foodComponents', 'reaction', 'reactionType']);
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
