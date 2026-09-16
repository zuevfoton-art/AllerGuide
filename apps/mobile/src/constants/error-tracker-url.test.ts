import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  isSelfHostedCrashTrackerUrl,
  isValidCrashIngestDsn,
  crashIngestHostname,
} = require('../../error-tracker-url.js') as {
  isSelfHostedCrashTrackerUrl: (raw: unknown) => boolean;
  isValidCrashIngestDsn: (raw: unknown) => boolean;
  crashIngestHostname: (raw: unknown) => string;
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

describe('isValidCrashIngestDsn', () => {
  it('requires https, a public key, a project path, and a non-sentry host', () => {
    expect(isValidCrashIngestDsn('https://key@errors.staging.aclearo.com/1')).toBe(true);
    expect(isValidCrashIngestDsn('https://errors.staging.aclearo.com/1')).toBe(false);
    expect(isValidCrashIngestDsn('http://key@errors.staging.aclearo.com/1')).toBe(false);
    expect(isValidCrashIngestDsn('https://key@errors.staging.aclearo.com/')).toBe(false);
    expect(isValidCrashIngestDsn('https://key@sentry.io/1')).toBe(false);
  });
});

describe('crashIngestHostname', () => {
  it('returns the lowercased host or empty', () => {
    expect(crashIngestHostname('https://key@errors.staging.aclearo.com/1')).toBe(
      'errors.staging.aclearo.com',
    );
    expect(crashIngestHostname('not-a-url')).toBe('');
  });
});
