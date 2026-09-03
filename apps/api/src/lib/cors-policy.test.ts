import { describe, expect, it } from 'vitest';
import { assertCorsPolicy } from './cors-policy';

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
