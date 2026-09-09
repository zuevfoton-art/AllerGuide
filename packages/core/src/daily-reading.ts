import type { WellnessVerbalTier } from './wellness-display';

/**
 * Daily reading — the one-paragraph answer to «how is today» that opens the
 * Today tab (north-star §4.1). The domain decides *what* is said and which
 * single next step is offered; the mobile adapter only resolves i18n keys.
 */
export type DailyReadingTone = 'calm' | 'watch' | 'careful';

export type DailyReadingDriver = 'no-profile' | 'no-data' | 'pollen' | 'air' | 'diary' | 'calm';

export type DailyReadingLeadId =
  | 'noProfile'
  | 'noData'
  | 'pollenHigh'
  | 'pollenModerate'
  | 'airHigh'
  | 'airModerate'
  | 'diaryHigh'
  | 'calm';

export type DailyReadingAdviceId = 'noProfile' | 'noData' | DailyReadingTone;

export type DailyReadingActionId =
  | 'create-profile'
  | 'open-map'
  | 'open-journal'
  | 'open-scanner';

export interface DailyReadingInput {
  hasProfile: boolean;
  /** False when pollen/air could not be fetched (offline or provider error). */
  envDataAvailable: boolean;
  pollenTier: WellnessVerbalTier;
  airTier: WellnessVerbalTier;
  diaryTier: WellnessVerbalTier;
  /** Localized plant name of the strongest pollen match, when known. */
  pollenAllergenLabel?: string | null;
}

export interface DailyReading {
  tone: DailyReadingTone;
  driver: DailyReadingDriver;
  leadId: DailyReadingLeadId;
  adviceId: DailyReadingAdviceId;
  /** Passed to the lead sentence as `{{allergen}}` when the driver is pollen. */
  allergenLabel: string | null;
  action: DailyReadingActionId;
}

const DRIVER_RULES: {
  driver: Exclude<DailyReadingDriver, 'no-profile' | 'no-data' | 'calm'>;
  tier: (input: DailyReadingInput) => WellnessVerbalTier;
  match: WellnessVerbalTier;
  tone: DailyReadingTone;
  leadId: DailyReadingLeadId;
}[] = [
  { driver: 'pollen', tier: (i) => i.pollenTier, match: 'high', tone: 'careful', leadId: 'pollenHigh' },
  { driver: 'air', tier: (i) => i.airTier, match: 'high', tone: 'careful', leadId: 'airHigh' },
  { driver: 'pollen', tier: (i) => i.pollenTier, match: 'moderate', tone: 'watch', leadId: 'pollenModerate' },
  { driver: 'air', tier: (i) => i.airTier, match: 'moderate', tone: 'watch', leadId: 'airModerate' },
  { driver: 'diary', tier: (i) => i.diaryTier, match: 'high', tone: 'watch', leadId: 'diaryHigh' },
];

const ACTION_BY_DRIVER: Record<DailyReadingDriver, DailyReadingActionId> = {
  'no-profile': 'create-profile',
  // Offline: keep the next step local instead of sending the user to a map that cannot load.
  'no-data': 'open-journal',
  pollen: 'open-map',
  air: 'open-map',
  diary: 'open-journal',
  calm: 'open-scanner',
};

export function buildDailyReading(input: DailyReadingInput): DailyReading {
  if (!input.hasProfile) {
    return reading('calm', 'no-profile', 'noProfile', 'noProfile', null);
  }

  if (!input.envDataAvailable) {
    return reading('calm', 'no-data', 'noData', 'noData', null);
  }

  for (const rule of DRIVER_RULES) {
    if (rule.tier(input) !== rule.match) continue;
    const allergen = rule.driver === 'pollen' ? input.pollenAllergenLabel?.trim() || null : null;
    return reading(rule.tone, rule.driver, rule.leadId, rule.tone, allergen);
  }

  return reading('calm', 'calm', 'calm', 'calm', null);
}

function reading(
  tone: DailyReadingTone,
  driver: DailyReadingDriver,
  leadId: DailyReadingLeadId,
  adviceId: DailyReadingAdviceId,
  allergenLabel: string | null,
): DailyReading {
  return { tone, driver, leadId, adviceId, allergenLabel, action: ACTION_BY_DRIVER[driver] };
}
