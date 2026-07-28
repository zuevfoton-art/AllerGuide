import { afterEach, describe, expect, it, vi } from 'vitest';
import { callScanLlm, resolveLlmScanProvider } from './llm-scan-provider';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe('resolveLlmScanProvider', () => {
  it('defaults to openai', () => {
    delete process.env.AI_PROVIDER;
    expect(resolveLlmScanProvider()).toBe('openai');
  });

  it('selects yandex when AI_PROVIDER=yandex', () => {
    process.env.AI_PROVIDER = 'yandex';
    expect(resolveLlmScanProvider()).toBe('yandex');
  });
});

describe('callScanLlm openai', () => {
  it('returns null without OPENAI_API_KEY', async () => {
    process.env.AI_PROVIDER = 'openai';
    delete process.env.OPENAI_API_KEY;
    expect(await callScanLlm('prompt')).toBeNull();
  });

  it('posts chat completions and returns content', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.OPENAI_BASE_URL = 'https://example.test/v1';
    process.env.OPENAI_MODEL = 'gpt-test';

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '{"verdict":"ok"}' } }] }), {
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const content = await callScanLlm('milk sugar');
    expect(content).toBe('{"verdict":"ok"}');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('callScanLlm yandex', () => {
  it('returns null without YC credentials', async () => {
    process.env.AI_PROVIDER = 'yandex';
    delete process.env.YC_AI_API_KEY;
    delete process.env.YC_FOLDER_ID;
    expect(await callScanLlm('prompt')).toBeNull();
  });

  it('posts foundationModels completion and returns text', async () => {
    process.env.AI_PROVIDER = 'yandex';
    process.env.YC_AI_API_KEY = 'yc-key';
    process.env.YC_FOLDER_ID = 'b1gfolder';
    process.env.YC_GPT_MODEL = 'yandexgpt-lite';

    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.modelUri).toBe('gpt://b1gfolder/yandexgpt-lite');
      expect(body.messages[0].role).toBe('system');
      return new Response(
        JSON.stringify({
          result: {
            alternatives: [{ message: { role: 'assistant', text: '{"level":"low"}' } }],
          },
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const content = await callScanLlm('состав: молоко');
    expect(content).toBe('{"level":"low"}');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://llm.api.cloud.yandex.net/foundationModels/v1/completion',
      expect.objectContaining({ method: 'POST' }),
    );
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Api-Key yc-key');
    expect(headers['x-folder-id']).toBe('b1gfolder');
  });

  it('returns null on non-OK response', async () => {
    process.env.AI_PROVIDER = 'yandex';
    process.env.YC_AI_API_KEY = 'yc-key';
    process.env.YC_FOLDER_ID = 'b1gfolder';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 403 })),
    );
    expect(await callScanLlm('x')).toBeNull();
  });
});
