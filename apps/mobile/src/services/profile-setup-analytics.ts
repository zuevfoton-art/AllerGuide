import type { AllergyConditionId } from '@allerguide/core';
import { trackEvent } from '@/src/services/analytics-service';
import { buildAllergenPickerModel } from '@/src/services/allergen-recommendation-display';

/** Counts only — no allergen ids or condition labels (analytics-events.mdc). */
export function trackProfileSetupAllergenStepComplete(input: {
  selectedAllergenIds: string[];
  conditionIds: AllergyConditionId[];
}): void {
  const model = buildAllergenPickerModel({
    selected: input.selectedAllergenIds,
    conditionIds: input.conditionIds,
  });
  trackEvent('profile_setup_step_complete', {
    step: 'allergens',
    recommended_count: model.recommendedCount,
    catalog_count: model.catalogCount,
    condition_count: input.conditionIds.length,
  });
}
