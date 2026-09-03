import { afterEach, describe, expect, it, vi } from 'vitest';
import { enrichmentPost } from './enrichment-api';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('enrichmentPost', () => {
  it('returns ok + data on 2xx', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true, text: 'молоко' }),
    }) as unknown as typeof fetch;

    const result = await enrichmentPost<{ ok: boolean; text: string }>('/api/ocr', {
      imageBase64: 'abc',
    });

    expect(result).toEqual({
      ok: true,
      status: 200,
      data: { ok: true, text: 'молоко' },
    });
  });

  it('soft-fails on non-2xx without throwing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ error: 'OCR disabled' }),
    }) as unknown as typeof fetch;

    const result = await enrichmentPost('/api/ocr', {});

    expect(result).toEqual({
      ok: false,
      status: 503,
      error: 'OCR disabled',
      data: { error: 'OCR disabled' },
    });
  });

  it('soft-fails when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Network request failed')) as unknown as typeof fetch;

    const result = await enrichmentPost('/api/ocr', {}, { context: 'testOcr' });

    expect(result).toEqual({ ok: false, status: 0, error: 'network_error' });
  });

  it('aborts hung enrichment instead of hanging the caller', async () => {
    global.fetch = vi.fn((_url: string, opts: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        opts.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    }) as unknown as typeof fetch;

    const result = await enrichmentPost('/api/ocr', {}, { timeoutMs: 20 });

    expect(result).toEqual({ ok: false, status: 0, error: 'network_error' });
  });
});
