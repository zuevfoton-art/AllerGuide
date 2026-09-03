import { logCaughtError } from '@/src/services/error-reporting';
import { refreshAccessToken } from '@/src/services/token-session';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

/** Abort a backend request after this long so the UI never hangs on "Подождите…". */
const DEFAULT_TIMEOUT_MS = 15000;

export function getApiBaseUrl() {
  return API_BASE;
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string | null;
    timeoutMs?: number;
  } = {},
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  const { method = 'GET', body, token, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const payload = (await response.json()) as T & { error?: string; ok?: boolean };

    if (!response.ok) {
      const canRefresh =
        response.status === 401 &&
        !path.startsWith('/api/auth/refresh') &&
        !path.startsWith('/api/auth/login') &&
        !path.startsWith('/api/auth/register') &&
        !path.startsWith('/api/auth/logout') &&
        Boolean(token);

      if (canRefresh) {
        const nextToken = await refreshAccessToken();
        if (nextToken && nextToken !== token) {
          return apiRequest<T>(path, { ...options, token: nextToken });
        }
      }

      return {
        ok: false,
        error: (payload as { error?: string }).error ?? 'Request failed',
        status: response.status,
      };
    }

    return { ok: true, data: payload };
  } catch (error) {
    logCaughtError('apiRequest', error, { extra: { path, method } });
    return { ok: false, error: 'Не удалось подключиться к серверу', status: 0 };
  } finally {
    clearTimeout(timeout);
  }
}
