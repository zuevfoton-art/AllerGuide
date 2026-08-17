import { describe, expect, it } from 'vitest';
import { isDefaultOnPublicFlag } from './features';

describe('isDefaultOnPublicFlag', () => {
  it('is on when the env value is unset or empty', () => {
    expect(isDefaultOnPublicFlag(undefined)).toBe(true);
    expect(isDefaultOnPublicFlag('')).toBe(true);
  });

  it('is on for explicit enable values', () => {
    expect(isDefaultOnPublicFlag('true')).toBe(true);
    expect(isDefaultOnPublicFlag('google')).toBe(true);
  });

  it('is off only for explicit disable values', () => {
    expect(isDefaultOnPublicFlag('false')).toBe(false);
    expect(isDefaultOnPublicFlag('off')).toBe(false);
  });
});
