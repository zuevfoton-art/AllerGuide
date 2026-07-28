import {
  buildAsitPrefill,
  buildFoodPrefill,
  buildInsectStingPrefill,
  buildMedicinePrefill,
  buildTriggerPrefill,
  isAsitCourseConfigured,
  parseAllergies,
  type FoodDrugScanRef,
} from '@allerguide/core';
import { getAsitCourse } from '@/src/services/asit-course-service';
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
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    logCaughtError('parseScanMatchIds', error, { level: 'warn' });
    return [];
  }
}

function findRecentFoodScan(profileId: number): FoodDrugScanRef | null {
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

/** Builds diary section editor state with domain prefills (orchestration only — logic in core). */
export async function buildDiarySectionEditorState(input: {
  sectionType: string;
  profileId: number | null;
  profileAllergiesJson: string;
  locale: AppLocale;
}): Promise<DiarySectionEditorState> {
  const { sectionType, profileId, profileAllergiesJson, locale } = input;

  if (sectionType === 'АСИТ' && profileId) {
    const course = getAsitCourse(profileId);
    if (course && isAsitCourseConfigured(course)) {
      return {
        mode: 'section',
        sectionType,
        prefill: { АСИТ: buildAsitPrefill(course) },
      };
    }
  }

  if (sectionType === 'Питание' && profileId) {
    const allergies = parseAllergies(profileAllergiesJson);
    const registry = getFoodDrugRegistry(profileId);
    const scanRef = findRecentFoodScan(profileId);
    const prefill = buildFoodPrefill(allergies, registry, scanRef);
    return { mode: 'section', sectionType, prefill: { Питание: prefill } };
  }

  if (sectionType === 'Лекарство' && profileId) {
    const passport = getAllergyPassport(profileId);
    const prefill = buildMedicinePrefill(passport.drugIntolerances);
    return { mode: 'section', sectionType, prefill: { Лекарство: prefill } };
  }

  if (sectionType === 'Укус насекомого' && profileId) {
    const allergies = parseAllergies(profileAllergiesJson);
    const plan = getInsectActionPlan(profileId);
    const prefill = buildInsectStingPrefill(allergies, plan);
    return { mode: 'section', sectionType, prefill: { 'Укус насекомого': prefill } };
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
