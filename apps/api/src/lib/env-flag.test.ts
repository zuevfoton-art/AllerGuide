import { describe, expect, it } from 'vitest';
import { isDefaultOnEnvFlag } from './env-flag';

describe('isDefaultOnEnvFlag', () => {
  it('is on when unset or empty', () => {
    expect(isDefaultOnEnvFlag(undefined)).toBe(true);
    expect(isDefaultOnEnvFlag('')).toBe(true);
  });

  it('is on for true', () => {
    expect(isDefaultOnEnvFlag('true')).toBe(true);
  });

  it('is off for false or off', () => {
    expect(isDefaultOnEnvFlag('false')).toBe(false);
    expect(isDefaultOnEnvFlag('off')).toBe(false);
  });
});
