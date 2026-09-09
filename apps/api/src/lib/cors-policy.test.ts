import { describe, expect, it } from 'vitest';
import { assertCorsPolicy, isAllowedCorsOrigin, parseCorsOrigins } from './cors-policy';

describe('assertCorsPolicy', () => {
  it('allows local/dev without CORS_ORIGINS', () => {
    expect(() => assertCorsPolicy({ NODE_ENV: 'development' })).not.toThrow();
  });

  it('allows production when CORS_ORIGINS is set', () => {
    expect(() =>
      assertCorsPolicy({
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://staging.aclearo.com',
      }),
    ).not.toThrow();
  });

  it('fails production boot when CORS_ORIGINS is empty', () => {
    expect(() => assertCorsPolicy({ NODE_ENV: 'production', CORS_ORIGINS: '' })).toThrow(
      /CORS_ORIGINS must be set/,
    );
  });
});

describe('isAllowedCorsOrigin', () => {
  it('parses a comma-separated allowlist', () => {
    expect(parseCorsOrigins({ CORS_ORIGINS: ' https://a.example,https://b.example ' })).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
  });

  it('allows missing Origin as a non-browser client', () => {
    expect(isAllowedCorsOrigin(undefined, { NODE_ENV: 'production', CORS_ORIGINS: 'https://app.example' })).toBe(
      true,
    );
  });

  it('allows any origin in non-production when no allowlist is set', () => {
    expect(isAllowedCorsOrigin('https://evil.example', { NODE_ENV: 'development' })).toBe(true);
  });

  it('denies browser origins in production when no allowlist is set', () => {
    expect(isAllowedCorsOrigin('https://evil.example', { NODE_ENV: 'production' })).toBe(false);
  });

  it('accepts only origins on the allowlist', () => {
    const env = { CORS_ORIGINS: 'https://app.example' };
    expect(isAllowedCorsOrigin('https://app.example', env)).toBe(true);
    expect(isAllowedCorsOrigin('https://evil.example', env)).toBe(false);
  });
});
