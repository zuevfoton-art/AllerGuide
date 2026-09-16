import { describe, expect, it } from 'vitest';
import { shouldShowAskFab } from './ask-fab-visibility';

describe('shouldShowAskFab', () => {
  it('shows on shell tabs and profile stack', () => {
    expect(shouldShowAskFab('/home')).toBe(true);
    expect(shouldShowAskFab('/diary')).toBe(true);
    expect(shouldShowAskFab('/scanner')).toBe(true);
    expect(shouldShowAskFab('/map')).toBe(true);
    expect(shouldShowAskFab('/profile')).toBe(true);
    expect(shouldShowAskFab('/market')).toBe(true);
  });

  it('hides on SOS, Ask route, auth, onboarding, and setup', () => {
    expect(shouldShowAskFab('/sos')).toBe(false);
    expect(shouldShowAskFab('/sos-edit')).toBe(false);
    expect(shouldShowAskFab('/ask')).toBe(false);
    expect(shouldShowAskFab('/login')).toBe(false);
    expect(shouldShowAskFab('/register')).toBe(false);
    expect(shouldShowAskFab('/onboarding')).toBe(false);
    expect(shouldShowAskFab('/onboarding-intro')).toBe(false);
    expect(shouldShowAskFab('/profile-setup')).toBe(false);
  });

  it('rejects empty pathnames', () => {
    expect(shouldShowAskFab(null)).toBe(false);
    expect(shouldShowAskFab('')).toBe(false);
    expect(shouldShowAskFab('/')).toBe(false);
  });
});
