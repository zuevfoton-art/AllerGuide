import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const settings = new Map<string, string>();

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

vi.mock('@/src/services/settings-service', () => ({
  getSetting: (key: string) => settings.get(key) ?? null,
  setSetting: (key: string, value: string) => {
    if (value) settings.set(key, value);
    else settings.delete(key);
  },
}));

vi.mock('@/src/services/secure-settings-service', () => ({
  getSensitiveSetting: (key: string) => settings.get(key) ?? null,
  setSensitiveSettingSync: (key: string, value: string) => {
    settings.set(key, value);
  },
  deleteSensitiveSetting: async (key: string) => {
    settings.delete(key);
  },
}));

describe('web token session', () => {
  beforeEach(async () => {
    settings.clear();
    vi.resetModules();
    const session = await import('./token-session');
    session.__resetWebAccessTokenForTests();
  });

  afterEach(async () => {
    const session = await import('./token-session');
    session.__resetWebAccessTokenForTests();
    settings.clear();
  });

  it('keeps the access token in memory and the refresh token in settings', async () => {
    const { applyAuthSession, getAccessToken, getRefreshToken } = await import('./token-session');
    applyAuthSession({ token: 'access-1', refreshToken: 'refresh-1' });

    expect(await getAccessToken()).toBe('access-1');
    expect(getRefreshToken()).toBe('refresh-1');
    expect(settings.get('authToken')).toBeUndefined();
    expect(settings.get('refreshToken')).toBe('refresh-1');
  });

  it('promotes a legacy persisted access token into memory and clears storage', async () => {
    settings.set('authToken', 'legacy-jwt');
    const { getAccessToken } = await import('./token-session');
    expect(await getAccessToken()).toBe('legacy-jwt');
    expect(settings.get('authToken')).toBeUndefined();
  });

  it('rotates the access token from a stored refresh token', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
    settings.set('refreshToken', 'refresh-old');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, token: 'access-2', refreshToken: 'refresh-2' }),
      }),
    );

    const { refreshAccessToken, getAccessToken, getRefreshToken } = await import('./token-session');
    expect(await refreshAccessToken()).toBe('access-2');
    expect(await getAccessToken()).toBe('access-2');
    expect(getRefreshToken()).toBeNull();

    vi.unstubAllGlobals();
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  it('refreshes from the httpOnly cookie when no refresh token is stored', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, token: 'access-cookie' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { refreshAccessToken, getRefreshToken } = await import('./token-session');
    expect(await refreshAccessToken()).toBe('access-cookie');
    expect(getRefreshToken()).toBeNull();
    expect(fetchMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        credentials: 'include',
        body: '{}',
      }),
    );

    vi.unstubAllGlobals();
    delete process.env.EXPO_PUBLIC_API_URL;
  });
});
