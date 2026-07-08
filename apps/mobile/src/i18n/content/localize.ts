import {
  DIARY_SECTIONS,
  type DiarySection,
  type DiaryStep,
} from '@allerguide/core';
import type { AppLocale } from '../types';
import type { DiarySectionContentMap, LocaleContent } from './types';

export function localizeDiarySection(
  section: DiarySection,
  content: DiarySectionContentMap,
): DiarySection {
  const localized = content[section.type];
  if (!localized) return section;

  return {
    ...section,
    title: localized.title,
    steps: section.steps.map((step) => localizeDiaryStep(step, localized.steps[step.id])),
  };
}

function localizeDiaryStep(step: DiaryStep, localized?: { label: string; placeholder?: string; choices?: string[] }) {
  if (!localized) return step;
  return {
    ...step,
    label: localized.label,
    placeholder: localized.placeholder ?? step.placeholder,
    choices: localized.choices ?? step.choices,
  };
}

export function localizeDiarySections(locale: AppLocale, content: LocaleContent): DiarySection[] {
  if (locale === 'ru') return DIARY_SECTIONS;
  return DIARY_SECTIONS.map((section) => localizeDiarySection(section, content.diarySections));
}

export function localizeDiaryType(type: string, content: LocaleContent): string {
  return content.diaryTypes[type] ?? type;
}

export function localizeReportBlockLabel(id: string, content: LocaleContent): string {
  return content.reportBlocks[id] ?? id;
}

export function localizeEmergencyRelation(relation: string, content: LocaleContent): string {
  return content.emergencyRelations[relation] ?? relation;
}

export function localizeAllergenCategory(category: string, content: LocaleContent): string {
  return content.allergenCategories[category] ?? category;
}

export function localizeAllergyConditionLabel(
  conditionId: string,
  content: LocaleContent,
): string {
  return content.allergyConditions[conditionId]?.label ?? conditionId;
}
