import { afterEach, describe, expect, it } from 'vitest';
import { isOverrideAuthRequired, isScanAuthRequired } from './scan-identity';

const ORIGINAL_AUTH = process.env.SCAN_REQUIRE_AUTH;

afterEach(() => {
  if (ORIGINAL_AUTH === undefined) {
    delete process.env.SCAN_REQUIRE_AUTH;
  } else {
    process.env.SCAN_REQUIRE_AUTH = ORIGINAL_AUTH;
  }
});

describe('scan identity flags', () => {
  it('reads SCAN_REQUIRE_AUTH', () => {
    process.env.SCAN_REQUIRE_AUTH = 'true';
    expect(isScanAuthRequired()).toBe(true);
    process.env.SCAN_REQUIRE_AUTH = 'false';
    expect(isScanAuthRequired()).toBe(false);
  });

  it('lets an explicit override win over SCAN_REQUIRE_AUTH', () => {
    process.env.SCAN_REQUIRE_AUTH = 'true';
    expect(isOverrideAuthRequired('false')).toBe(false);
    expect(isOverrideAuthRequired('true')).toBe(true);
    expect(isOverrideAuthRequired(undefined)).toBe(true);
  });
});
