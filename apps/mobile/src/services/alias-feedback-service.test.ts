import { beforeEach, describe, expect, it, vi } from 'vitest';

const persistDbWrites = vi.fn(async () => undefined);
const runSync = vi.fn();
const getAllSync = vi.fn(() => []);

vi.mock('@/src/db/init', () => ({
  getDb: () => ({ runSync, getAllSync, getFirstSync: vi.fn() }),
  persistDbWrites: () => persistDbWrites(),
}));

vi.mock('@/src/services/auth-service', () => ({
  getCurrentUserId: () => 3,
}));

vi.mock('@/src/services/owned-profiles', () => ({
  isOwnedProfile: (profileId: number) => profileId === 7,
}));

vi.mock('@/src/services/api-client', () => ({
  apiRequest: vi.fn(async () => ({ ok: true })),
}));

vi.mock('@/src/services/error-reporting', () => ({
  logCaughtError: vi.fn(),
}));

describe('alias-feedback-service', () => {
  beforeEach(() => {
    runSync.mockClear();
    persistDbWrites.mockClear();
  });

  it('rejects empty terms and foreign profiles', async () => {
    const { saveAliasFeedback } = await import('./alias-feedback-service');
    expect(await saveAliasFeedback({ term: '   ' })).toEqual({
      ok: false,
      code: 'invalid_input',
    });
    expect(await saveAliasFeedback({ term: 'молочко', profileId: 99 })).toEqual({
      ok: false,
      code: 'profile_not_found',
    });
    expect(runSync).not.toHaveBeenCalled();
  });

  it('writes locally and flushes persistence on web', async () => {
    const { saveAliasFeedback } = await import('./alias-feedback-service');
    const saved = await saveAliasFeedback({
      term: 'молочко',
      profileId: 7,
      scanInput: 'молоко',
    });

    expect(saved.ok).toBe(true);
    expect(runSync).toHaveBeenCalled();
    expect(persistDbWrites).toHaveBeenCalledTimes(1);
  });
});
