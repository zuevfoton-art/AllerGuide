import type { DiarySection } from './diary';
import { DIARY_AUTO_STEP_IDS, DIARY_SECTIONS } from './diary';
import type { ProfileCapabilities } from './profile-capabilities';

export const FULL_WIZARD_EXCLUDED_SECTION_TYPES = new Set([
  'Пикфлоуметрия',
  'АСИТ',
  'Визит к врачу',
  'Терапия',
]);

export const FULL_WIZARD_HIDDEN_STEP_IDS = DIARY_AUTO_STEP_IDS;

export const DIARY_FEED_HIDDEN_STEP_IDS = DIARY_AUTO_STEP_IDS;

export type DiaryAutoMetadata = Partial<
  Record<'pollenContext' | 'recentScan' | 'todayMeds' | 'scanRef', string>
>;

export function attachDiaryAutoMetadata(
  answers: Record<string, string>,
  metadata: DiaryAutoMetadata,
): Record<string, string> {
  const next = { ...answers };
  for (const [key, value] of Object.entries(metadata)) {
    const trimmed = value?.trim();
    if (!trimmed || next[key]?.trim()) continue;
    next[key] = trimmed;
  }
  return next;
}

/**
 * Adaptive full-wizard route: profile-visible sections minus modules that
 * have their own dedicated screens, and without auto/duplicate steps.
 */
export function buildAdaptiveDiaryWizardSections(
  visibleSections: DiarySection[],
): DiarySection[] {
  return visibleSections
    .filter((section) => !FULL_WIZARD_EXCLUDED_SECTION_TYPES.has(section.type))
    .map((section) => ({
      ...section,
      steps: section.steps.filter((step) => !FULL_WIZARD_HIDDEN_STEP_IDS.has(step.id)),
    }))
    .filter((section) => section.steps.length > 0);
}

export function buildAdaptiveDiaryWizardFromCapabilities(
  capabilities: Pick<ProfileCapabilities, 'diarySectionTypes'>,
): DiarySection[] {
  const visible = DIARY_SECTIONS.filter((section) =>
    capabilities.diarySectionTypes.includes(section.type),
  );
  return buildAdaptiveDiaryWizardSections(visible);
}
