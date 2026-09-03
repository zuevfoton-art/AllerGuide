import { beforeEach, describe, expect, it, vi } from 'vitest';

const persistDbWrites = vi.fn(async () => undefined);
const runSync = vi.fn();
const getAllSync = vi.fn((): unknown[] => []);

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

type ApiResult = { ok: true; data?: unknown } | { ok: false; error: string; status: number };

const apiRequest = vi.fn(async (..._args: unknown[]): Promise<ApiResult> => ({ ok: true }));

vi.mock('@/src/services/api-client', () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

vi.mock('@/src/services/error-reporting', () => ({
  logCaughtError: vi.fn(),
}));

describe('alias-feedback-service', () => {
  beforeEach(() => {
    runSync.mockClear();
    persistDbWrites.mockClear();
    getAllSync.mockReset();
    getAllSync.mockReturnValue([]);
    apiRequest.mockReset();
    apiRequest.mockResolvedValue({ ok: true });
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
    expect(persistDbWrites).toHaveBeenCalled();
  });

  it('flushPendingAliasFeedback deletes rows after successful API post', async () => {
    getAllSync.mockReturnValue([
      {
        id: 'alias-1',
        term: 'молочко',
        suggested_allergen_id: null,
        context: null,
        profile_id: 7,
        scan_input: 'молоко',
        status: 'pending',
        created_at: '2026-08-14T08:00:00.000Z',
      },
    ]);

    const { flushPendingAliasFeedback } = await import('./alias-feedback-service');
    const result = await flushPendingAliasFeedback();

    expect(result).toEqual({ synced: 1, failed: 0 });
    expect(apiRequest).toHaveBeenCalledWith(
      '/api/alias-feedback',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(runSync).toHaveBeenCalledWith('DELETE FROM alias_feedback WHERE id = ?', ['alias-1']);
    expect(persistDbWrites).toHaveBeenCalled();
  });

  it('keeps pending rows when API soft-fails', async () => {
    getAllSync.mockReturnValue([
      {
        id: 'alias-2',
        term: 'кефирчик',
        suggested_allergen_id: null,
        context: null,
        profile_id: null,
        scan_input: null,
        status: 'pending',
        created_at: '2026-08-14T08:00:00.000Z',
      },
    ]);
    apiRequest.mockResolvedValue({ ok: false, error: 'down', status: 503 });

    const { flushPendingAliasFeedback } = await import('./alias-feedback-service');
    const result = await flushPendingAliasFeedback();

    expect(result).toEqual({ synced: 0, failed: 1 });
    expect(runSync).not.toHaveBeenCalledWith(
      'DELETE FROM alias_feedback WHERE id = ?',
      expect.anything(),
    );
  });
});
