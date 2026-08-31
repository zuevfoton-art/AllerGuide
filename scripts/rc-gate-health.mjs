/**
 * Interpret GET /api/health from staging.
 * External HTTP is untrusted: never assume the body is JSON.
 */

const SNIPPET_MAX = 180;

export function compactSnippet(text, max = SNIPPET_MAX) {
  const compact = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max)}…`;
}

export function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * @param {{ status: number, contentType?: string | null, bodyText: string }} input
 * @returns {{ ok: true } | { ok: false, failure: string }}
 */
export function interpretStagingHealthResponse({ status, contentType, bodyText }) {
  const snippet = compactSnippet(bodyText);
  const type = contentType || 'no content-type';

  if (/is stopped and cannot be used/i.test(bodyText)) {
    return {
      ok: false,
      failure: `Staging API Gateway is stopped (HTTP ${status}): ${snippet}`,
    };
  }

  const payload = tryParseJson(bodyText);
  if (payload == null) {
    return {
      ok: false,
      failure: `Staging health returned non-JSON (HTTP ${status}, ${type}): ${snippet}`,
    };
  }

  if (status < 200 || status >= 300 || payload.ok === false) {
    const parts = [`HTTP ${status}`];
    if (payload.ok === false) parts.push('body.ok=false');
    const dbError =
      payload.database && typeof payload.database.error === 'string'
        ? payload.database.error
        : null;
    if (dbError) parts.push(dbError);
    return {
      ok: false,
      failure: `Staging health check failed: ${parts.join(', ')}`,
    };
  }

  return { ok: true };
}
