import type { AllergyConditionId } from './allergy-conditions';
import {
  profileEnablesAsit,
  profileEnablesPeakFlow,
} from './allergy-conditions';

function profileEnablesAct(conditionIds: AllergyConditionId[]): boolean {
  return conditionIds.includes('asthma');
}
import type { AllergyPassport } from './allergy-passport';
import type { ClinicalScaleId } from './clinical-scales';
import { DIARY_SECTIONS } from './diary';
import {
  filterDiarySections,
  getRecommendedScalesForConditions,
  inferConditionIdsFromAllergies,
  isDiarySectionVisible,
} from './diary-profile';
import { DOCTOR_REPORT_BLOCKS } from './doctor-report';
import {
  profileEnablesDrugFocus,
  profileEnablesFoodFocus,
} from './food-drug-allergy';
import {
  parseAllergies,
  parseProfileAllergenIds,
  type ProfileAllergenId,
} from './profile-allergens';
import { OPEN_METEO_POLLEN_ALLERGEN_IDS } from './pollen-taxonomy';
import type { Profile } from './types';

const POLLEN_ALLERGEN_ID_SET = new Set<string>(Object.values(OPEN_METEO_POLLEN_ALLERGEN_IDS));

export type ScannerMode = 'product' | 'menu' | 'medicine' | 'cosmetics';

export type HomeQuickAction = 'symptoms' | 'food' | 'medicine' | 'peakFlow' | 'asit';

export interface ProfileCapabilitiesInput {
  profile: Pick<Profile, 'allergies'>;
  explicitConditions: AllergyConditionId[];
  passport?: Pick<AllergyPassport, 'drugIntolerances'>;
}

export interface ProfileCapabilities {
  /** Explicit conditions used for module gating (explicit-first). */
  gatingConditions: AllergyConditionId[];
  /** Heuristic conditions inferred from allergen labels — hints only, not gating. */
  inferredConditions: AllergyConditionId[];
  allergenIds: ProfileAllergenId[];
  allergyLabels: string[];

  modules: {
    peakFlow: boolean;
    /** ACT questionnaire (asthma-gated, independent of PEF meter). */
    act: boolean;
    asit: boolean;
    insectSting: boolean;
    foodFocus: boolean;
    drugFocus: boolean;
    skinFocus: boolean;
  };

  diarySectionTypes: string[];
  recommendedScaleIds: ClinicalScaleId[];
  defaultScannerMode: ScannerMode;
  homeQuickActions: HomeQuickAction[];
  reportBlockIds: string[];
  reminders: {
    pollen: boolean;
    asit: boolean;
    act: boolean;
    epinephrine: boolean;
  };
}

/** Gating uses only explicitly selected condition types. */
export function getGatingConditions(
  explicit: AllergyConditionId[] = [],
): AllergyConditionId[] {
  return [...explicit];
}

/** Heuristic inference from allergen display names — for onboarding hints, not gating. */
export function getInferredConditions(allergies: string[]): AllergyConditionId[] {
  return inferConditionIdsFromAllergies(allergies);
}

export function profileEnablesInsectStingGating(
  gatingConditions: AllergyConditionId[],
): boolean {
  return gatingConditions.includes('insect');
}

export function profileEnablesSkinFocus(gatingConditions: AllergyConditionId[]): boolean {
  return gatingConditions.includes('dermatitis');
}

function profileHasAnyPollenAllergen(allergenIds: ProfileAllergenId[]): boolean {
  return allergenIds.some(
    (id) => POLLEN_ALLERGEN_ID_SET.has(id) || id.endsWith('-pollen'),
  );
}

function profileSuggestsPollenReminders(
  gatingConditions: AllergyConditionId[],
  allergenIds: ProfileAllergenId[],
): boolean {
  if (gatingConditions.includes('pollinosis') || gatingConditions.includes('rhinitis')) {
    return true;
  }
  if (gatingConditions.includes('household') && profileHasAnyPollenAllergen(allergenIds)) {
    return true;
  }
  return false;
}

export function getDefaultScannerModeForCapabilities(
  capabilities: Pick<ProfileCapabilities, 'gatingConditions' | 'modules'>,
): ScannerMode {
  if (capabilities.gatingConditions.includes('drug') || capabilities.modules.drugFocus) {
    return 'medicine';
  }
  if (capabilities.gatingConditions.includes('dermatitis')) {
    return 'cosmetics';
  }
  if (capabilities.gatingConditions.includes('food')) {
    return 'product';
  }
  return 'product';
}

export function getHomeQuickActionsForCapabilities(
  capabilities: Pick<ProfileCapabilities, 'modules' | 'gatingConditions'>,
): HomeQuickAction[] {
  const actions: HomeQuickAction[] = ['symptoms'];

  if (capabilities.modules.foodFocus || capabilities.gatingConditions.includes('food')) {
    actions.push('food');
  }

  if (capabilities.modules.drugFocus || capabilities.gatingConditions.includes('drug')) {
    actions.push('medicine');
  } else if (
    capabilities.gatingConditions.some((id) =>
      ['pollinosis', 'rhinitis', 'asthma', 'dermatitis', 'household', 'animal', 'insect'].includes(
        id,
      ),
    )
  ) {
    actions.push('medicine');
  }

  if (capabilities.modules.peakFlow) {
    actions.push('peakFlow');
  }

  if (capabilities.modules.asit) {
    actions.push('asit');
  }

  return actions;
}

export function getDefaultReportBlockIdsForCapabilities(
  capabilities: Pick<
    ProfileCapabilities,
    'modules' | 'gatingConditions' | 'recommendedScaleIds'
  >,
): string[] {
  const ids = new Set<string>([
    'symptoms',
    'medicine',
    'food',
    'triggers',
    'triggerContext',
    'timeline',
  ]);

  if (capabilities.modules.peakFlow) ids.add('peakflow');
  if (capabilities.modules.asit) ids.add('asit');
  if (capabilities.modules.foodFocus || capabilities.modules.drugFocus) {
    ids.add('foodDrug');
  }
  if (capabilities.modules.insectSting) ids.add('insect');
  if (capabilities.modules.skinFocus) ids.add('skin');
  if (capabilities.recommendedScaleIds.length > 0) ids.add('scales');

  return DOCTOR_REPORT_BLOCKS.filter((block) => ids.has(block.id)).map((block) => block.id);
}

function buildRecommendedScaleIds(
  gatingConditions: AllergyConditionId[],
  allergyLabels: string[],
): ClinicalScaleId[] {
  const scales = new Set(getRecommendedScalesForConditions(gatingConditions));
  const urticaria = /крапивниц|urticaria|urticari/i;
  if (allergyLabels.some((name) => urticaria.test(name.toLowerCase()))) {
    scales.add('uas7');
  }
  return [...scales];
}

export function buildProfileCapabilities(
  input: ProfileCapabilitiesInput,
): ProfileCapabilities {
  const gatingConditions = getGatingConditions(input.explicitConditions);
  const allergenIds = parseProfileAllergenIds(input.profile.allergies);
  const allergyLabels = parseAllergies(input.profile.allergies);
  const inferredConditions = getInferredConditions(allergyLabels);
  const drugIntolerances = input.passport?.drugIntolerances ?? [];

  const modules = {
    peakFlow: profileEnablesPeakFlow(gatingConditions),
    act: profileEnablesAct(gatingConditions),
    asit: profileEnablesAsit(gatingConditions),
    insectSting: profileEnablesInsectStingGating(gatingConditions),
    foodFocus: profileEnablesFoodFocus(gatingConditions, allergyLabels),
    drugFocus: profileEnablesDrugFocus(gatingConditions, drugIntolerances),
    skinFocus: profileEnablesSkinFocus(gatingConditions),
  };

  const recommendedScaleIds = buildRecommendedScaleIds(gatingConditions, allergyLabels);

  const diarySectionTypes = filterDiarySections(DIARY_SECTIONS, gatingConditions).map(
    (section) => section.type,
  );

  const capabilities: ProfileCapabilities = {
    gatingConditions,
    inferredConditions,
    allergenIds,
    allergyLabels,
    modules,
    diarySectionTypes,
    recommendedScaleIds,
    defaultScannerMode: 'product',
    homeQuickActions: [],
    reportBlockIds: [],
    reminders: {
      pollen: profileSuggestsPollenReminders(gatingConditions, allergenIds),
      asit: modules.asit,
      act: modules.act,
      epinephrine:
        modules.insectSting ||
        gatingConditions.includes('food') ||
        gatingConditions.includes('drug'),
    },
  };

  capabilities.defaultScannerMode = getDefaultScannerModeForCapabilities(capabilities);
  capabilities.homeQuickActions = getHomeQuickActionsForCapabilities(capabilities);
  capabilities.reportBlockIds = getDefaultReportBlockIdsForCapabilities(capabilities);

  return capabilities;
}

export function suggestConditionsForAllergenId(
  allergenId: ProfileAllergenId,
): AllergyConditionId[] {
  const label =
    parseAllergies(JSON.stringify([allergenId]))[0]?.toLowerCase() ?? allergenId.toLowerCase();
  return inferConditionIdsFromAllergies([label]);
}

export function getMissingConditionsForAllergens(
  allergenIds: ProfileAllergenId[],
  explicitConditions: AllergyConditionId[],
): AllergyConditionId[] {
  const explicit = new Set(explicitConditions);
  const missing = new Set<AllergyConditionId>();

  for (const id of allergenIds) {
    for (const suggested of suggestConditionsForAllergenId(id)) {
      if (!explicit.has(suggested)) missing.add(suggested);
    }
  }

  return [...missing];
}

export function filterDiarySectionsForCapabilities<T extends { type: string }>(
  sections: T[],
  capabilities: Pick<ProfileCapabilities, 'gatingConditions'>,
): T[] {
  return sections.filter((section) =>
    isDiarySectionVisible(section.type, capabilities.gatingConditions),
  );
}
