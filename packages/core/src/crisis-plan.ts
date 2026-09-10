/**
 * The numbered plan shown first on the crisis screen (north-star §4.2).
 * Order follows ASCIA / FARE action plans: adrenaline → call help → stay with
 * the person → second dose. The doctor-provided plan wins when it exists.
 */
export const CRISIS_PLAN_STEP_IDS = [
  'epinephrine',
  'callEmergency',
  'stay',
  'secondDose',
] as const;

export type CrisisPlanStepId = (typeof CRISIS_PLAN_STEP_IDS)[number];

export type CrisisPlanStep =
  | { source: 'default'; id: CrisisPlanStepId }
  | { source: 'personal'; text: string };

export interface CrisisPlan {
  source: 'default' | 'personal';
  steps: CrisisPlanStep[];
}

export function parsePersonalCrisisPlanSteps(plan: string | null | undefined): string[] {
  if (!plan) return [];
  return plan
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function buildCrisisPlan(personalPlan?: string | null): CrisisPlan {
  const personalSteps = parsePersonalCrisisPlanSteps(personalPlan);
  if (personalSteps.length > 0) {
    return {
      source: 'personal',
      steps: personalSteps.map((text) => ({ source: 'personal', text })),
    };
  }
  return {
    source: 'default',
    steps: CRISIS_PLAN_STEP_IDS.map((id) => ({ source: 'default', id })),
  };
}
