import { describe, expect, it } from 'vitest';
import { shouldShowAskFab, shouldUseExtendedAskFab } from './ask-fab-visibility';

describe('shouldShowAskFab', () => {
  it('shows on allowed tab roots and product stack', () => {
    expect(shouldShowAskFab('/home')).toBe(true);
    expect(shouldShowAskFab('/diary')).toBe(true);
    expect(shouldShowAskFab('/scanner')).toBe(true);
    expect(shouldShowAskFab('/map')).toBe(true);
    expect(shouldShowAskFab('/profile')).toBe(true);
    expect(shouldShowAskFab('/profiles')).toBe(true);
    expect(shouldShowAskFab('/profile-edit')).toBe(true);
    expect(shouldShowAskFab('/market')).toBe(true);
    expect(shouldShowAskFab('/doctor-report')).toBe(true);
    expect(shouldShowAskFab('/expert')).toBe(true);
  });

  it('hides on SOS, Ask route, auth, onboarding, setup, lock, and legal', () => {
    expect(shouldShowAskFab('/sos')).toBe(false);
    expect(shouldShowAskFab('/sos-edit')).toBe(false);
    expect(shouldShowAskFab('/ask')).toBe(false);
    expect(shouldShowAskFab('/login')).toBe(false);
    expect(shouldShowAskFab('/register')).toBe(false);
    expect(shouldShowAskFab('/onboarding')).toBe(false);
    expect(shouldShowAskFab('/onboarding-intro')).toBe(false);
    expect(shouldShowAskFab('/profile-setup')).toBe(false);
    expect(shouldShowAskFab('/lock')).toBe(false);
    expect(shouldShowAskFab('/legal/privacy')).toBe(false);
    expect(shouldShowAskFab('/settings')).toBe(false);
  });

  it('rejects empty pathnames', () => {
    expect(shouldShowAskFab(null)).toBe(false);
    expect(shouldShowAskFab('')).toBe(false);
    expect(shouldShowAskFab('/')).toBe(false);
  });
});

describe('shouldUseExtendedAskFab', () => {
  it('extends on tab roots only', () => {
    expect(shouldUseExtendedAskFab('/home')).toBe(true);
    expect(shouldUseExtendedAskFab('/diary')).toBe(true);
    expect(shouldUseExtendedAskFab('/scanner')).toBe(true);
    expect(shouldUseExtendedAskFab('/map')).toBe(true);
    expect(shouldUseExtendedAskFab('/profile')).toBe(true);
    expect(shouldUseExtendedAskFab('/market')).toBe(false);
    expect(shouldUseExtendedAskFab('/doctor-report')).toBe(false);
    expect(shouldUseExtendedAskFab('/expert')).toBe(false);
    expect(shouldUseExtendedAskFab('/profile-edit')).toBe(false);
    expect(shouldUseExtendedAskFab('/sos')).toBe(false);
  });
});
