import { afterEach, describe, expect, it } from 'vitest';
import { assertScanAuthPolicy, isBillableAiEnabled } from './scan-auth-policy';

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('assertScanAuthPolicy', () => {
  it('detects billable AI flags', () => {
    expect(isBillableAiEnabled({ AI_SCAN_ENABLED: 'true' })).toBe(true);
    expect(isBillableAiEnabled({ YC_OCR_ENABLED: 'true' })).toBe(true);
    expect(isBillableAiEnabled({})).toBe(false);
  });

  it('allows local/dev with SCAN_REQUIRE_AUTH off', () => {
    expect(() =>
      assertScanAuthPolicy({
        NODE_ENV: 'development',
        AI_SCAN_ENABLED: 'true',
        SCAN_REQUIRE_AUTH: 'false',
      }),
    ).not.toThrow();
  });

  it('allows production when AI is off', () => {
    expect(() =>
      assertScanAuthPolicy({
        NODE_ENV: 'production',
        SCAN_REQUIRE_AUTH: 'false',
      }),
    ).not.toThrow();
  });

  it('allows production when SCAN_REQUIRE_AUTH is true', () => {
    expect(() =>
      assertScanAuthPolicy({
        NODE_ENV: 'production',
        AI_SCAN_ENABLED: 'true',
        SCAN_REQUIRE_AUTH: 'true',
      }),
    ).not.toThrow();
  });

  it('fails production boot when AI is on and SCAN_REQUIRE_AUTH is not true', () => {
    expect(() =>
      assertScanAuthPolicy({
        NODE_ENV: 'production',
        DISH_LLM_ENABLED: 'true',
        SCAN_REQUIRE_AUTH: 'false',
      }),
    ).toThrow(/SCAN_REQUIRE_AUTH must be true/);
  });
});
