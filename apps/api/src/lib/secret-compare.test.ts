import { describe, expect, it } from 'vitest';
import { secretsMatch } from './secret-compare';

describe('secretsMatch', () => {
  it('accepts an exact match', () => {
    expect(secretsMatch('s3cret-key', 's3cret-key')).toBe(true);
  });

  it('rejects a mismatch regardless of shared prefix or length', () => {
    expect(secretsMatch('s3cret-keZ', 's3cret-key')).toBe(false);
    expect(secretsMatch('s3cret-ke', 's3cret-key')).toBe(false);
    expect(secretsMatch('s3cret-key-and-more', 's3cret-key')).toBe(false);
  });

  it('rejects when either side is missing, so an unset key never authorizes', () => {
    expect(secretsMatch(undefined, 's3cret-key')).toBe(false);
    expect(secretsMatch('s3cret-key', undefined)).toBe(false);
    expect(secretsMatch(undefined, undefined)).toBe(false);
    expect(secretsMatch('', '')).toBe(false);
  });
});
