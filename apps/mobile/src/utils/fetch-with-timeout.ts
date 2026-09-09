/** Enrichment requests are optional; none of them may hang a screen. */
export const DEFAULT_FETCH_TIMEOUT_MS = 8000;

/**
 * `fetch` without a timeout can stay pending for minutes on a captive or
 * unreachable network (CI emulators, metro tunnels), which is indistinguishable
 * from a hung screen. Abort instead, so callers fall back to offline data.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, ...init } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
