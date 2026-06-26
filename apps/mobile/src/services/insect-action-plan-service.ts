import {
  createDefaultInsectActionPlan,
  parseInsectActionPlan,
  serializeInsectActionPlan,
  type InsectActionPlan,
} from '@allerguide/core';
import { getSetting, setSetting } from '@/src/services/settings-service';

function planKey(profileId: number) {
  return `insectActionPlan:${profileId}`;
}

export function getInsectActionPlan(profileId: number): InsectActionPlan | null {
  return parseInsectActionPlan(getSetting(planKey(profileId)));
}

export function saveInsectActionPlan(profileId: number, plan: InsectActionPlan) {
  setSetting(planKey(profileId), serializeInsectActionPlan(plan));
}

export function createEmptyInsectActionPlan(): InsectActionPlan {
  return createDefaultInsectActionPlan();
}

export function clearInsectActionPlan(profileId: number) {
  setSetting(planKey(profileId), '');
}
