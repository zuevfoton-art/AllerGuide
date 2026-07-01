import type { Profile, Scenario } from './types';
export { parseAllergies } from './profile-allergens';

export type BootstrapRoute = '/onboarding' | '/profile-setup' | '/(tabs)/home';

export function getWizardStep(scenario: Scenario | null, profiles: Profile[]): 'self' | 'child' | null {
  if (scenario !== 'both') return null;
  const hasSelf = profiles.some((p) => p.type === 'self');
  const hasChild = profiles.some((p) => p.type === 'child');
  if (!hasSelf) return 'self';
  if (!hasChild) return 'child';
  return null;
}

export function resolveBootstrapRoute(
  profiles: Profile[],
  scenario: Scenario | null,
  onboardingComplete: boolean,
): BootstrapRoute {
  if (profiles.length === 0) return '/onboarding';

  if (onboardingComplete) return '/(tabs)/home';

  if (scenario === 'both') {
    const step = getWizardStep(scenario, profiles);
    if (step) return '/profile-setup';
  }

  if (profiles.length > 0 && scenario !== 'both') return '/(tabs)/home';

  if (profiles.length >= 2) return '/(tabs)/home';

  return '/profile-setup';
}

export type AuthedBootstrapRoute = '/onboarding-intro' | BootstrapRoute;

/**
 * First route for an already-authenticated user.
 *
 * A returning user who already has at least one profile skips the first-run
 * intro tour and onboarding and goes straight to their resolved route (Home,
 * or the profile-setup wizard if a "both" scenario is only half complete).
 * The intro is only shown to brand-new users who have no profiles yet.
 */
export function resolveAuthedBootstrapRoute(
  profiles: Profile[],
  scenario: Scenario | null,
  introComplete: boolean,
  onboardingComplete: boolean,
): AuthedBootstrapRoute {
  if (profiles.length > 0) {
    return resolveBootstrapRoute(profiles, scenario, onboardingComplete);
  }

  if (!introComplete) {
    return '/onboarding-intro';
  }

  return resolveBootstrapRoute(profiles, scenario, onboardingComplete);
}

export function shouldCompleteOnboarding(scenario: Scenario | null, profiles: Profile[]): boolean {
  if (!scenario) return profiles.length > 0;
  if (scenario === 'both') {
    return profiles.some((p) => p.type === 'self') && profiles.some((p) => p.type === 'child');
  }
  return profiles.length >= 1;
}
