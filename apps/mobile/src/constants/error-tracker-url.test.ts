import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { isSelfHostedCrashTrackerUrl } = require('../../error-tracker-url.js') as {
  isSelfHostedCrashTrackerUrl: (raw: unknown) => boolean;
};

describe('isSelfHostedCrashTrackerUrl', () => {
  it('rejects missing, invalid, and sentry.io URLs', () => {
    expect(isSelfHostedCrashTrackerUrl(undefined)).toBe(false);
    expect(isSelfHostedCrashTrackerUrl('')).toBe(false);
    expect(isSelfHostedCrashTrackerUrl('not-a-url')).toBe(false);
    expect(isSelfHostedCrashTrackerUrl('https://sentry.io/')).toBe(false);
    expect(isSelfHostedCrashTrackerUrl('https://o1.ingest.sentry.io/')).toBe(false);
  });

  it('accepts the staging GlitchTip host', () => {
    expect(isSelfHostedCrashTrackerUrl('https://errors.staging.aclearo.com')).toBe(true);
  });
});
