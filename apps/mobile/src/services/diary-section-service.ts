import {
  buildAsitPrefillWithDoseNumber,
  buildClinicalScaleEditorState,
  buildFoodPrefill,
  buildInsectStingPrefill,
  buildMedicinePrefill,
  buildMedicinePrefillFromCard,
  buildTriggerPrefill,
  buildPrescribedTherapyPrefill,
  getDiarySection,
  getProfileAgeYears,
  isAsitCourseConfigured,
  isPrescribedCourseConfigured,
  parseAllergies,
  parseScanHistoryMatchLabels,
  serializeDiaryPhotoUris,
  ASIT_SIMPLIFIED_STEP_IDS,
  PRESCRIBED_SIMPLIFIED_STEP_IDS,
  type DiarySection,
  type FoodDrugScanRef,
  type MedicineCard,
} from '@allerguide/core';
import { getAsitCourse } from '@/src/services/asit-course-service';
import { getPrescribedCourse } from '@/src/services/prescribed-therapy-service';
import { getDiaryEntries } from '@/src/services/diary-service';
import { loadDiaryTriggerContext } from '@/src/services/diary-context-service';
import { getFoodDrugRegistry } from '@/src/services/food-drug-registry-service';
import { getInsectActionPlan } from '@/src/services/insect-action-plan-service';
import { getAllergyPassport } from '@/src/services/sos-passport-service';
import { listScanHistory } from '@/src/services/scan-history-service';
import { fetchWellnessSnapshot } from '@/src/services/wellness-service';
import { logCaughtError } from '@/src/services/error-reporting';
import type { AppLocale } from '@/src/i18n/types';

/** Recent product/menu scans within this window prefill the «Питание» diary section. */
const RECENT_FOOD_SCAN_WINDOW_MS = 24 * 60 * 60 * 1000;

export type DiarySectionEditorState = {
  mode: 'section';
  sectionType: string;
  prefill?: Record<string, Record<string, string>>;
};

function parseScanMatchIds(raw: string): string[] {
  return parseScanHistoryMatchLabels(raw);
}

export function findRecentFoodScanForProfile(profileId: number): FoodDrugScanRef | null {
  const scans = listScanHistory(profileId);
  const recentFoodScan = scans.find((scan) => scan.mode === 'product' || scan.mode === 'menu');
  if (!recentFoodScan) return null;

  const ageMs = Date.now() - new Date(recentFoodScan.createdAt).getTime();
  if (ageMs > RECENT_FOOD_SCAN_WINDOW_MS) return null;

  return {
    productName: recentFoodScan.productName,
    verdict: recentFoodScan.verdict,
    level: recentFoodScan.level,
    matches: parseScanMatchIds(recentFoodScan.matches),
    createdAt: recentFoodScan.createdAt,
  };
}

export type DiarySectionEditorStateWithSection = DiarySectionEditorState & {
  section?: DiarySection;
};

export { buildClinicalScaleEditorState };

/** Builds diary section editor state with domain prefills (orchestration only — logic in core). */
export async function buildDiarySectionEditorState(input: {
  sectionType: string;
  profileId: number | null;
  profileAllergiesJson: string;
  locale: AppLocale;
  profileBirthYear?: number | null;
  recognizedCard?: MedicineCard;
  photoUri?: string;
}): Promise<DiarySectionEditorStateWithSection> {
  const { sectionType, profileId, profileAllergiesJson, locale } = input;

  if (sectionType === 'АСИТ' && profileId) {
    const course = getAsitCourse(profileId);
    if (course && isAsitCourseConfigured(course)) {
      const entries = await getDiaryEntries(profileId);
      const asitDoseCount = entries.filter((e) => e.type === 'АСИТ').length;
      const prefill = buildAsitPrefillWithDoseNumber(course, asitDoseCount);
      const fullSection = getDiarySection('АСИТ');
      const simplifiedSection: DiarySection | undefined = fullSection
        ? {
            ...fullSection,
            steps: fullSection.steps.filter((s) =>
              (ASIT_SIMPLIFIED_STEP_IDS as readonly string[]).includes(s.id),
            ),
          }
        : undefined;
      return {
        mode: 'section',
        sectionType,
        prefill: { АСИТ: prefill },
        section: simplifiedSection,
      };
    }
  }

  if (sectionType === 'Питание' && profileId) {
    const allergies = parseAllergies(profileAllergiesJson);
    const registry = getFoodDrugRegistry(profileId);
    const scanRef = findRecentFoodScanForProfile(profileId);
    const prefill = buildFoodPrefill(allergies, registry, scanRef);
    return { mode: 'section', sectionType, prefill: { Питание: prefill } };
  }

  if (sectionType === 'Лекарство' && profileId) {
    const passport = getAllergyPassport(profileId);
    const ageYears = getProfileAgeYears(input.profileBirthYear);
    const base = buildMedicinePrefill(passport.drugIntolerances);
    const fromCard = input.recognizedCard
      ? buildMedicinePrefillFromCard(input.recognizedCard, ageYears, passport.drugIntolerances)
      : {};
    const prefill = { ...base, ...fromCard };
    if (input.photoUri) {
      prefill.medicinePhotos = serializeDiaryPhotoUris([input.photoUri]);
    }
    return { mode: 'section', sectionType, prefill: { Лекарство: prefill } };
  }

  if (sectionType === 'Укус насекомого' && profileId) {
    const allergies = parseAllergies(profileAllergiesJson);
    const plan = getInsectActionPlan(profileId);
    const prefill = buildInsectStingPrefill(allergies, plan);
    return { mode: 'section', sectionType, prefill: { 'Укус насекомого': prefill } };
  }

  if (sectionType === 'Терапия' && profileId) {
    const course = getPrescribedCourse(profileId);
    if (course && isPrescribedCourseConfigured(course)) {
      const fullSection = getDiarySection('Терапия');
      const simplifiedSection: DiarySection | undefined = fullSection
        ? {
            ...fullSection,
            steps: fullSection.steps.filter((s) =>
              (PRESCRIBED_SIMPLIFIED_STEP_IDS as readonly string[]).includes(s.id),
            ),
          }
        : undefined;
      return {
        mode: 'section',
        sectionType,
        prefill: { Терапия: buildPrescribedTherapyPrefill(course) },
        section: simplifiedSection,
      };
    }
  }

  if (sectionType === 'Триггер' && profileId) {
    const wellness = await fetchWellnessSnapshot(profileAllergiesJson, [], locale).catch(
      (error) => {
        logCaughtError('buildDiarySectionEditorState.fetchWellness', error, { level: 'warn' });
        return null;
      },
    );
    const context = await loadDiaryTriggerContext(profileId, wellness?.factors);
    const prefill = { Триггер: buildTriggerPrefill(context) };
    return { mode: 'section', sectionType, prefill };
  }

  return { mode: 'section', sectionType };
}
