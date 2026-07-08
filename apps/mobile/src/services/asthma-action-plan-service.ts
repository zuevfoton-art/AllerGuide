import {
  createDefaultAsthmaActionPlan,
  parseAsthmaActionPlan,
  serializeAsthmaActionPlan,
  type AsthmaActionPlan,
} from '@allerguide/core';
import { getSetting, setSetting } from '@/src/services/settings-service';

function planKey(profileId: number) {
  return `asthmaActionPlan:${profileId}`;
}

export function getAsthmaActionPlan(profileId: number): AsthmaActionPlan | null {
  return parseAsthmaActionPlan(getSetting(planKey(profileId)));
}

export function saveAsthmaActionPlan(profileId: number, plan: AsthmaActionPlan) {
  setSetting(planKey(profileId), serializeAsthmaActionPlan(plan));
}

export function createEmptyAsthmaActionPlan(): AsthmaActionPlan {
  return createDefaultAsthmaActionPlan();
}

export function clearAsthmaActionPlan(profileId: number) {
  setSetting(planKey(profileId), '');
}
