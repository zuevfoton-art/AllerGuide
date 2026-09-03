import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MedicineCard } from '@allerguide/core';

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

vi.mock('./token-session', () => ({
  refreshAccessToken: vi.fn(),
  getAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  setRefreshToken: vi.fn(),
  applyAuthSession: vi.fn(),
  usesCookieAuth: () => true,
  clearAuthSessionTokens: vi.fn(),
}));

const card: MedicineCard = {
  name: 'Зиртек',
  activeSubstance: 'цетиризин',
  form: 'таблетки',
  strength: '10 мг',
  manufacturer: '',
  indications: 'аллергический ринит',
  ageUsage: [],
  minAgeYears: 6,
  ingredients: '',
  allergenTags: [],
  aliases: [],
  source: 'manual',
  confidence: 'medium',
};

describe('medicines-api', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  it('skips the catalog write when the device has no backend token', async () => {
    vi.doMock('@/src/services/auth-service', () => ({
      getBackendAuthToken: vi.fn().mockResolvedValue(null),
    }));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { rememberMedicineViaApi } = await import('./medicines-api');
    expect(await rememberMedicineViaApi(card)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the bearer token when writing to the catalog', async () => {
    vi.doMock('@/src/services/auth-service', () => ({
      getBackendAuthToken: vi.fn().mockResolvedValue('tok'),
    }));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, medicine: { ...card, source: 'catalog' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { rememberMedicineViaApi } = await import('./medicines-api');
    const saved = await rememberMedicineViaApi(card);

    expect(saved?.source).toBe('catalog');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.test/api/medicines');
    expect((init as RequestInit & { headers: Record<string, string> }).headers.Authorization).toBe(
      'Bearer tok',
    );
  });

  it('sends the bearer token when searching so overlays can merge', async () => {
    vi.doMock('@/src/services/auth-service', () => ({
      getBackendAuthToken: vi.fn().mockResolvedValue('tok'),
    }));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, medicines: [card] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { searchMedicinesFromCatalog } = await import('./medicines-api');
    const hits = await searchMedicinesFromCatalog('зирт');

    expect(hits).toHaveLength(1);
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toEqual({
      Authorization: 'Bearer tok',
    });
  });

  it('searches the catalog without a token', async () => {
    vi.doMock('@/src/services/auth-service', () => ({
      getBackendAuthToken: vi.fn().mockResolvedValue(null),
    }));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, medicines: [card] }),
      }),
    );

    const { searchMedicinesFromCatalog } = await import('./medicines-api');
    const hits = await searchMedicinesFromCatalog('зирт');
    expect(hits.map((item) => item.name)).toEqual(['Зиртек']);
  });
});
