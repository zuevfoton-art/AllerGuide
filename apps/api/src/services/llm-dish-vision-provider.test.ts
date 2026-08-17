import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildYandexVisionModelUri,
  callDishVisionLlm,
  dishVisionConfigured,
  DishVisionProviderError,
  medicineVisionConfigured,
} from './llm-dish-vision-provider';

describe('llm-dish-vision-provider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.AI_DISH_VISION_ENABLED;
    delete process.env.AI_MEDICINE_VISION_ENABLED;
    delete process.env.AI_SCAN_ENABLED;
    delete process.env.AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.YC_AI_API_KEY;
    delete process.env.YC_FOLDER_ID;
    delete process.env.YC_VISION_MODEL;
    delete process.env.YC_VISION_BASE_URL;
  });

  it('is off unless AI_SCAN and AI_DISH_VISION are enabled', () => {
    process.env.AI_SCAN_ENABLED = 'true';
    process.env.OPENAI_API_KEY = 'sk-test';
    expect(dishVisionConfigured()).toBe(false);

    process.env.AI_DISH_VISION_ENABLED = 'true';
    process.env.AI_PROVIDER = 'openai';
    expect(dishVisionConfigured()).toBe(true);
  });

  it('requires YC credentials for yandex provider', () => {
    process.env.AI_SCAN_ENABLED = 'true';
    process.env.AI_DISH_VISION_ENABLED = 'true';
    process.env.AI_PROVIDER = 'yandex';
    expect(dishVisionConfigured()).toBe(false);
    process.env.YC_AI_API_KEY = 'key';
    process.env.YC_FOLDER_ID = 'folder';
    expect(dishVisionConfigured()).toBe(true);
  });

  it('is off for medicine vision unless AI_SCAN and AI_MEDICINE_VISION are enabled', () => {
    process.env.AI_SCAN_ENABLED = 'true';
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.AI_PROVIDER = 'openai';
    expect(medicineVisionConfigured()).toBe(false);

    process.env.AI_MEDICINE_VISION_ENABLED = 'true';
    expect(medicineVisionConfigured()).toBe(true);
  });

  it('builds gpt:// URI and preserves /latest in catalog ids', () => {
    expect(buildYandexVisionModelUri('folder', 'qwen3.6-35b-a3b/latest')).toBe(
      'gpt://folder/qwen3.6-35b-a3b/latest',
    );
    expect(buildYandexVisionModelUri('folder', 'qwen3.6-35b-a3b')).toBe(
      'gpt://folder/qwen3.6-35b-a3b/latest',
    );
    expect(
      buildYandexVisionModelUri('folder', 'gpt://folder/qwen3.6-35b-a3b/latest'),
    ).toBe('gpt://folder/qwen3.6-35b-a3b/latest');
  });

  it('throws DishVisionProviderError with status on Yandex 403', async () => {
    process.env.AI_SCAN_ENABLED = 'true';
    process.env.AI_DISH_VISION_ENABLED = 'true';
    process.env.AI_PROVIDER = 'yandex';
    process.env.YC_AI_API_KEY = 'key';
    process.env.YC_FOLDER_ID = 'folder';
    process.env.YC_VISION_MODEL = 'gemma-3-27b-it';

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ error: { message: 'Forbidden' } }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(
      callDishVisionLlm({ imageBase64: 'aGVsbG8=', mimeType: 'image/jpeg' }),
    ).rejects.toMatchObject({
      name: 'DishVisionProviderError',
      status: 403,
      providerError: 'Forbidden',
    } satisfies Partial<DishVisionProviderError>);

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      'https://ai.api.cloud.yandex.net/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('returns chat content from a successful Yandex response', async () => {
    process.env.AI_SCAN_ENABLED = 'true';
    process.env.AI_DISH_VISION_ENABLED = 'true';
    process.env.AI_PROVIDER = 'yandex';
    process.env.YC_AI_API_KEY = 'key';
    process.env.YC_FOLDER_ID = 'folder';
    process.env.YC_VISION_MODEL = 'qwen3.6-35b-a3b/latest';

    const content = JSON.stringify({
      dishName: 'Оливье',
      ingredients: ['яйцо'],
      confidence: 'medium',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { role: 'assistant', content } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    await expect(
      callDishVisionLlm({ imageBase64: 'aGVsbG8=', mimeType: 'image/jpeg' }),
    ).resolves.toBe(content);
  });
});
