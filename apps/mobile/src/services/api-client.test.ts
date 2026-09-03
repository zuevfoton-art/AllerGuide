import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api-client';
import { refreshAccessToken } from './token-session';

vi.mock('./token-session', () => ({
  refreshAccessToken: vi.fn(),
  usesCookieAuth: () => false,
}));

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

  it('retries once after a 401 when refresh succeeds', async () => {
    vi.mocked(refreshAccessToken).mockResolvedValueOnce('new-jwt');
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: { id: 1 } }),
      }) as unknown as typeof fetch;

    const result = await apiRequest('/api/profiles', { token: 'old-jwt' });

    expect(result).toEqual({ ok: true, data: { user: { id: 1 } } });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect((global.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer new-jwt' }),
      }),
    );
  });

  it('does not refresh on auth login failures', async () => {
    vi.mocked(refreshAccessToken).mockClear();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Invalid credentials' }),
    }) as unknown as typeof fetch;

    const result = await apiRequest('/api/auth/login', {
      method: 'POST',
      token: 'stale-jwt',
      body: { login: 'x' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });
});
