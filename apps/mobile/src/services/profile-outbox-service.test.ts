import { beforeEach, describe, expect, it, vi } from 'vitest';

const settings = new Map<string, string>();
const runSync = vi.fn();
const persistDbWrites = vi.fn(async () => undefined);
const backendCreateProfile = vi.fn();
const backendUpdateProfile = vi.fn();
const upsertLocalProfile = vi.fn();
const setActiveProfile = vi.fn();

vi.mock('@/src/services/settings-service', () => ({
  getSetting: (key: string) => settings.get(key) ?? null,
  setSetting: (key: string, value: string) => {
    settings.set(key, value);
  },
}));

vi.mock('@/src/db/init', () => ({
  getDb: () => ({ runSync, getAllSync: vi.fn(), getFirstSync: vi.fn() }),
  persistDbWrites: () => persistDbWrites(),
}));

vi.mock('@/src/services/auth-service', () => ({
  getBackendAuthToken: async () => 'jwt',
}));

vi.mock('@/src/services/backend-api', () => ({
  backendCreateProfile: (...args: unknown[]) => backendCreateProfile(...args),
  backendUpdateProfile: (...args: unknown[]) => backendUpdateProfile(...args),
  upsertLocalProfile: (...args: unknown[]) => upsertLocalProfile(...args),
}));

vi.mock('@/src/store/app-store', () => ({
  useAppStore: {
    getState: () => ({ activeProfileId: 11, setActiveProfile }),
  },
}));

vi.mock('@/src/services/error-reporting', () => ({
  logCaughtError: vi.fn(),
}));

const sampleInput = {
  name: 'Анна',
  birthYear: 1990,
  type: 'self' as const,
  allergies: ['milk'],
};

describe('profile-outbox-service', () => {
  beforeEach(() => {
    settings.clear();
    runSync.mockClear();
    persistDbWrites.mockClear();
    backendCreateProfile.mockReset();
    backendUpdateProfile.mockReset();
    upsertLocalProfile.mockClear();
    setActiveProfile.mockClear();
  });

  it('enqueues and lists pending mutations', async () => {
    const { enqueueProfileOutbox, listProfileOutbox } = await import('./profile-outbox-service');
    enqueueProfileOutbox({ op: 'create', localId: 11, input: sampleInput });
    expect(listProfileOutbox()).toHaveLength(1);
    expect(listProfileOutbox()[0]?.op).toBe('create');
  });

  it('flushProfileOutbox posts creates and drops the local temp row when ids differ', async () => {
    backendCreateProfile.mockResolvedValue({
      ok: true,
      data: {
        profile: { id: 99, userId: 7, name: 'Анна', birthYear: 1990, type: 'self', allergies: '["milk"]' },
      },
    });

    const { enqueueProfileOutbox, flushProfileOutbox, listProfileOutbox } = await import(
      './profile-outbox-service'
    );
    enqueueProfileOutbox({ op: 'create', localId: 11, input: sampleInput });

    const result = await flushProfileOutbox();
    expect(result).toEqual({ synced: 1, failed: 0 });
    expect(upsertLocalProfile).toHaveBeenCalled();
    expect(runSync).toHaveBeenCalledWith('DELETE FROM profiles WHERE id = ?', [11]);
    expect(setActiveProfile).toHaveBeenCalled();
    expect(listProfileOutbox()).toEqual([]);
    expect(persistDbWrites).toHaveBeenCalled();
  });

  it('keeps items when the API is unreachable', async () => {
    backendCreateProfile.mockResolvedValue({ ok: false, error: 'down', status: 0 });

    const { enqueueProfileOutbox, flushProfileOutbox, listProfileOutbox } = await import(
      './profile-outbox-service'
    );
    enqueueProfileOutbox({ op: 'create', localId: 11, input: sampleInput });

    const result = await flushProfileOutbox();
    expect(result.synced).toBe(0);
    expect(listProfileOutbox()).toHaveLength(1);
  });
});
