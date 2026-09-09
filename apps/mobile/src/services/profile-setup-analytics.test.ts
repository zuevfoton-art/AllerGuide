import { afterEach, describe, expect, it, vi } from 'vitest';

const trackEvent = vi.fn();

vi.mock('@/src/services/analytics-service', () => ({
  trackEvent,
}));

describe('trackProfileSetupAllergenStepComplete', () => {
  afterEach(() => {
    trackEvent.mockReset();
  });

  it('emits counts without allergen ids', async () => {
    const { trackProfileSetupAllergenStepComplete } = await import('./profile-setup-analytics');
    trackProfileSetupAllergenStepComplete({
      selectedAllergenIds: ['birch-pollen', 'milk'],
      conditionIds: ['pollinosis'],
    });

    expect(trackEvent).toHaveBeenCalledWith('profile_setup_step_complete', {
      step: 'allergens',
      recommended_count: 1,
      catalog_count: 1,
      condition_count: 1,
    });
    const props = trackEvent.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(JSON.stringify(props)).not.toMatch(/birch-pollen|milk|pollinosis/);
  });
});
