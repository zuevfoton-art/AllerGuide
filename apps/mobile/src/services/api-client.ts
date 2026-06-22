const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

export function getApiBaseUrl() {
  return API_BASE;
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string | null;
  } = {},
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  const { method = 'GET', body, token } = options;

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });

    const payload = (await response.json()) as T & { error?: string; ok?: boolean };

    if (!response.ok) {
      return {
        ok: false,
        error: (payload as { error?: string }).error ?? 'Request failed',
        status: response.status,
      };
    }

    return { ok: true, data: payload };
  } catch {
    return { ok: false, error: 'Не удалось подключиться к серверу', status: 0 };
  }
}
