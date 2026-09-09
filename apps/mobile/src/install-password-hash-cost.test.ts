import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * `vi.resetModules()` gives each case a fresh `@allerguide/core` singleton, so
 * the cost must be read from the same registry the module under test wrote to.
 */
async function iterationsAfterImport(platformOs: string): Promise<number> {
  vi.resetModules();
  vi.doMock('react-native', () => ({ Platform: { OS: platformOs } }));
  await import('./install-password-hash-cost');
  const core = await import('@allerguide/core');
  return core.getPasswordHashIterations();
}

describe('install-password-hash-cost', () => {
  afterEach(() => {
    vi.doUnmock('react-native');
    vi.resetModules();
  });

  it('lowers the PBKDF2 cost on Hermes (native)', async () => {
    const core = await import('@allerguide/core');
    expect(await iterationsAfterImport('android')).toBe(
      core.PASSWORD_HASH_ITERATIONS_INTERPRETED,
    );
  });

  it('keeps the JIT cost on web', async () => {
    const core = await import('@allerguide/core');
    expect(await iterationsAfterImport('web')).toBe(core.PASSWORD_HASH_ITERATIONS_JIT);
  });
});
