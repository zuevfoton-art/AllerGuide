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

vi.mock('@/src/services/secure-settings-service', () => ({
  hydrateSensitiveSettings: vi.fn().mockResolvedValue(undefined),
  getSensitiveSetting: (key: string) => secureStore.get(key) ?? null,
  setSensitiveSettingSync: (key: string, value: string) => {
    secureStore.set(key, value);
  },
  deleteSensitiveSetting: vi.fn(),
}));

const backendFetchMe = vi.fn();
const getAuthToken = vi.fn();
const clearAuthToken = vi.fn();
const syncProfilesFromBackend = vi.fn().mockResolvedValue({ ok: true });

vi.mock('@/src/services/token-session', () => ({
  applyAuthSession: vi.fn(),
  getRefreshToken: vi.fn(() => null),
  refreshAccessToken: vi.fn(async () => null),
  usesCookieAuth: () => false,
}));

vi.mock('@/src/services/backend-api', () => ({
  backendFetchMe: (...args: unknown[]) => backendFetchMe(...args),
  backendLogout: vi.fn().mockResolvedValue({ ok: true }),
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
  syncProfilesFromBackend: (...args: unknown[]) => syncProfilesFromBackend(...args),
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
    syncProfilesFromBackend.mockClear();
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
    expect(syncProfilesFromBackend).toHaveBeenCalledWith(42, 'jwt-token');
  });

  it('hydrates userId from SecureStore into settings', async () => {
    secureStore.set('authUserId', '7');
    settings.set('authUserJson', JSON.stringify({ id: 7, login: 'x@y.z', loginType: 'email' }));
    getAuthToken.mockResolvedValue('secure-jwt');

    const { restoreAuthSession } = await import('./auth-service');
    await restoreAuthSession();

    expect(settings.get('authUserId')).toBe('7');
    expect(settings.has('authToken')).toBe(false);
    expect(backendFetchMe).not.toHaveBeenCalled();
    expect(syncProfilesFromBackend).toHaveBeenCalledWith(7, 'secure-jwt');
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
    expect(syncProfilesFromBackend).toHaveBeenCalledWith(9, 'jwt-token');
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
