import { fetchWithTimeout, DEFAULT_FETCH_TIMEOUT_MS } from '@/src/utils/fetch-with-timeout';
import { getApiBaseUrl } from '@/src/services/api-client';
import { logCaughtError } from '@/src/services/error-reporting';

export type EnrichmentOk<T> = { ok: true; status: number; data: T };
export type EnrichmentFail<T = unknown> = {
  ok: false;
  status: number;
  error: string;
  data?: T;
};
export type EnrichmentResult<T> = EnrichmentOk<T> | EnrichmentFail<T>;

function resolveEnrichmentBaseUrl(): string {
  return getApiBaseUrl() || 'http://localhost:3001';
}

/**
 * Optional backend enrichment POST: always times out and soft-fails.
 * Callers keep local/OCR/heuristic paths when `ok: false`.
 */
export async function enrichmentPost<T>(
  path: string,
  body: unknown,
  options: {
    token?: string | null;
    timeoutMs?: number;
    context?: string;
  } = {},
): Promise<EnrichmentResult<T>> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const context = options.context ?? 'enrichmentPost';

  try {
    const response = await fetchWithTimeout(`${resolveEnrichmentBaseUrl()}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: JSON.stringify(body),
      timeoutMs,
    });

    const data = (await response.json().catch(() => ({}))) as T & { error?: string };

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: data.error || `HTTP ${response.status}`,
        data,
      };
    }

    return { ok: true, status: response.status, data };
  } catch (error) {
    logCaughtError(context, error, { extra: { path } });
    return { ok: false, status: 0, error: 'network_error' };
  }
}
