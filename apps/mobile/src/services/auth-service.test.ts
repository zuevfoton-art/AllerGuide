import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const settings = new Map<string, string>();
const secureStore = new Map<string, string>();

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: (key: string) => Promise.resolve(secureStore.get(key) ?? null),
  setItemAsync: (key: string, value: string) => {
    secureStore.set(key, value);
    return Promise.resolve();
  },
  deleteItemAsync: (key: string) => {
    secureStore.delete(key);
    return Promise.resolve();
  },
}));

vi.mock('@/src/db/init', () => ({
  getDb: () => ({
    runSync: vi.fn(),
    getFirstSync: vi.fn(() => null),
    getAllSync: vi.fn(() => []),
  }),
}));

vi.mock('@/src/services/settings-service', () => ({
  getSetting: (key: string) => settings.get(key) ?? null,
  setSetting: (key: string, value: string) => {
    settings.set(key, value);
  },
}));

const backendFetchMe = vi.fn();
const getAuthToken = vi.fn();
const clearAuthToken = vi.fn();

vi.mock('@/src/services/backend-api', () => ({
  backendFetchMe: (...args: unknown[]) => backendFetchMe(...args),
  getAuthToken: () => getAuthToken(),
  clearAuthToken: () => clearAuthToken(),
  cacheAuthUser: (user: { id: number; login: string; loginType: string }) => {
    settings.set('authUserId', String(user.id));
    settings.set('authUserJson', JSON.stringify(user));
  },
  getCachedAuthUser: () => {
    const raw = settings.get('authUserJson');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  clearCachedAuthUser: () => {
    settings.delete('authUserId');
    settings.delete('authUserJson');
  },
  setAuthToken: vi.fn(),
  backendRegister: vi.fn(),
  backendLogin: vi.fn(),
  backendDeleteAccount: vi.fn(),
  backendReplitExchange: vi.fn(),
  syncProfilesFromBackend: vi.fn(),
}));

vi.mock('@/src/store/app-store', () => ({
  useAppStore: {
    getState: () => ({ resetAppState: vi.fn() }),
  },
}));

vi.mock('@/src/constants/features', () => ({
  BACKEND_AUTH_ENABLED: true,
}));

describe('restoreAuthSession', () => {
  beforeEach(() => {
    settings.clear();
    secureStore.clear();
    backendFetchMe.mockReset();
    getAuthToken.mockReset();
    clearAuthToken.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('keeps session when token and cached user exist (offline-first)', async () => {
    const user = { id: 42, login: 'a@b.c', loginType: 'email' as const };
    settings.set('authUserId', '42');
    settings.set('authUserJson', JSON.stringify(user));
    getAuthToken.mockResolvedValue('jwt-token');

    const { restoreAuthSession } = await import('./auth-service');
    await restoreAuthSession();

    expect(backendFetchMe).not.toHaveBeenCalled();
    expect(settings.get('authUserId')).toBe('42');
  });

  it('hydrates userId and token from SecureStore into settings', async () => {
    secureStore.set('authUserId', '7');
    secureStore.set('authToken', 'secure-jwt');
    settings.set('authUserJson', JSON.stringify({ id: 7, login: 'x@y.z', loginType: 'email' }));
    getAuthToken.mockResolvedValue('secure-jwt');

    const { restoreAuthSession } = await import('./auth-service');
    await restoreAuthSession();

    expect(settings.get('authUserId')).toBe('7');
    expect(settings.get('authToken')).toBe('secure-jwt');
    expect(backendFetchMe).not.toHaveBeenCalled();
  });

  it('fetches /me when token exists but cache is missing', async () => {
    getAuthToken.mockResolvedValue('jwt-token');
    backendFetchMe.mockResolvedValue({
      ok: true,
      data: { user: { id: 9, login: 'new@user.dev', loginType: 'email' } },
    });

    const { restoreAuthSession } = await import('./auth-service');
    await restoreAuthSession();

    expect(backendFetchMe).toHaveBeenCalledWith('jwt-token');
    expect(settings.get('authUserId')).toBe('9');
  });

  it('clears session when token is missing but cache remains', async () => {
    settings.set('authUserId', '1');
    settings.set('authUserJson', JSON.stringify({ id: 1, login: 'a@b.c', loginType: 'email' }));
    getAuthToken.mockResolvedValue(null);

    const { restoreAuthSession, isAuthenticated } = await import('./auth-service');
    await restoreAuthSession();

    expect(isAuthenticated()).toBe(false);
  });
});
