import {
  createDefaultFoodDrugRegistry,
  parseFoodDrugRegistry,
  serializeFoodDrugRegistry,
  type FoodDrugRegistry,
} from '@allerguide/core';
import { getSetting, setSetting } from '@/src/services/settings-service';

function registryKey(profileId: number) {
  return `foodDrugRegistry:${profileId}`;
}

export function getFoodDrugRegistry(profileId: number): FoodDrugRegistry | null {
  return parseFoodDrugRegistry(getSetting(registryKey(profileId)));
}

export function saveFoodDrugRegistry(profileId: number, registry: FoodDrugRegistry) {
  setSetting(registryKey(profileId), serializeFoodDrugRegistry(registry));
}

export function createEmptyFoodDrugRegistry(): FoodDrugRegistry {
  return createDefaultFoodDrugRegistry();
}

export function clearFoodDrugRegistry(profileId: number) {
  setSetting(registryKey(profileId), '');
}
