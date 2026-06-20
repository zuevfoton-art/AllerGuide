import type { Profile, Scenario } from './types';

export type BootstrapRoute = '/onboarding' | '/profile-setup' | '/(tabs)/home';

export function parseAllergies(allergiesJson: string): string[] {
  try {
    const parsed = JSON.parse(allergiesJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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

export function shouldCompleteOnboarding(scenario: Scenario | null, profiles: Profile[]): boolean {
  if (!scenario) return profiles.length > 0;
  if (scenario === 'both') {
    return profiles.some((p) => p.type === 'self') && profiles.some((p) => p.type === 'child');
  }
  return profiles.length >= 1;
}
