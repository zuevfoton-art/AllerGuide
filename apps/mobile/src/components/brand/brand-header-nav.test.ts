import { describe, expect, it } from 'vitest';
import { shouldShowScreenBrandHeader } from './brand-header-nav';

describe('shouldShowScreenBrandHeader', () => {
  it('hides the lockup on login and registration', () => {
    expect(shouldShowScreenBrandHeader('/login')).toBe(false);
    expect(shouldShowScreenBrandHeader('/register')).toBe(false);
    expect(shouldShowScreenBrandHeader('/forgot-password')).toBe(false);
    expect(shouldShowScreenBrandHeader('/reset-password')).toBe(false);
  });

  it('shows the lockup on post-auth screens', () => {
    expect(shouldShowScreenBrandHeader('/home')).toBe(true);
    expect(shouldShowScreenBrandHeader('/profile')).toBe(true);
    expect(shouldShowScreenBrandHeader('/map')).toBe(true);
    expect(shouldShowScreenBrandHeader('/clinical-scales')).toBe(true);
  });

  it('hides the lockup when the path is empty', () => {
    expect(shouldShowScreenBrandHeader(null)).toBe(false);
    expect(shouldShowScreenBrandHeader('')).toBe(false);
  });
});
