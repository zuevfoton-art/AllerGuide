import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  searchIngredientsWithYandex,
  yandexSearchConfigured,
} from './yandex-search-ingredients';

describe('yandex-search-ingredients', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.YC_SEARCH_ENABLED;
    delete process.env.YC_AI_API_KEY;
    delete process.env.YC_FOLDER_ID;
  });

  it('is disabled without flag/credentials', () => {
    process.env.YC_SEARCH_ENABLED = 'false';
    expect(yandexSearchConfigured()).toBe(false);
  });

  it('uses generative search answer when available', async () => {
    process.env.YC_SEARCH_ENABLED = 'true';
    process.env.YC_AI_API_KEY = 'test-key';
    process.env.YC_FOLDER_ID = 'folder';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { content: 'Состав: картофель, морковь, яйца, майонез' },
        }),
      }),
    );

    const result = await searchIngredientsWithYandex('оливье');
    expect(result?.ingredients).toContain('картофель');
    expect(result?.source).toBe('yandex_gen');
  });
});
