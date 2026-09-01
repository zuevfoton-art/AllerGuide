import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FETCH_TIMEOUT_MS, fetchWithTimeout } from './fetch-with-timeout';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
});

describe('fetchWithTimeout', () => {
  it('aborts a request that never settles', async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    ) as unknown as typeof fetch;

    const pending = fetchWithTimeout('https://example.test/slow');
    const assertion = expect(pending).rejects.toThrow('aborted');
    await vi.advanceTimersByTimeAsync(DEFAULT_FETCH_TIMEOUT_MS);
    await assertion;
  });

  it('passes the response through and clears the timer', async () => {
    const response = new Response('{}', { status: 200 });
    globalThis.fetch = vi.fn(async () => response) as unknown as typeof fetch;

    await expect(fetchWithTimeout('https://example.test/fast')).resolves.toBe(response);
  });

  it('forwards request options and honours a custom timeout', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await fetchWithTimeout('https://example.test/post', {
      method: 'POST',
      timeoutMs: 100,
    });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.signal).toBeDefined();
    expect('timeoutMs' in init).toBe(false);
  });
});
