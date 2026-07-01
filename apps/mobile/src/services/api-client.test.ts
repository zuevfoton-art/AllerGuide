import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api-client';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('apiRequest', () => {
  it('returns ok + data on 2xx', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { id: 1 }, token: 'jwt' }),
    }) as unknown as typeof fetch;

    const result = await apiRequest<{ user: { id: number }; token: string }>('/api/auth/register', {
      method: 'POST',
      body: { login: 'x' },
    });

    expect(result).toEqual({ ok: true, data: { user: { id: 1 }, token: 'jwt' } });
  });

  it('surfaces server error message and status on non-2xx', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ error: 'Пользователь уже существует' }),
    }) as unknown as typeof fetch;

    const result = await apiRequest('/api/auth/register', { method: 'POST' });

    expect(result).toEqual({ ok: false, error: 'Пользователь уже существует', status: 409 });
  });

  it('returns a connection error when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Network request failed')) as unknown as typeof fetch;

    const result = await apiRequest('/api/auth/register', { method: 'POST' });

    expect(result).toEqual({ ok: false, error: 'Не удалось подключиться к серверу', status: 0 });
  });

  it('aborts and fails gracefully instead of hanging when the server never responds', async () => {
    global.fetch = vi.fn((_url: string, opts: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        opts.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    }) as unknown as typeof fetch;

    const result = await apiRequest('/api/auth/register', { method: 'POST', timeoutMs: 20 });

    expect(result).toEqual({ ok: false, error: 'Не удалось подключиться к серверу', status: 0 });
  });
});
