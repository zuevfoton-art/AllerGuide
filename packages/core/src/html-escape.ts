/**
 * HTML escaping for report/passport export.
 *
 * Exported HTML is rendered in a same-origin `window.open()` document on web and
 * through `expo-print` (a WebView) on native, so any unescaped free text — profile
 * names, diary notes, or product/dish names coming from Open Food Facts and other
 * third-party catalogues — would execute as markup.
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapes text for interpolation into HTML text nodes and quoted attributes. */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);
}

/** Escapes text and converts newlines to `<br/>` for multi-line HTML blocks. */
export function escapeHtmlMultiline(value: unknown): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br/>');
}

/**
 * Escapes a URL for a quoted HTML attribute, dropping schemes that can execute
 * script (`javascript:`, `vbscript:`, and non-image `data:` payloads).
 */
export function escapeHtmlAttributeUrl(value: unknown): string {
  const raw = String(value ?? '').trim();
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(raw)?.[1]?.toLowerCase();
  if (scheme && !['http', 'https', 'data', 'file', 'content'].includes(scheme)) return '';
  if (scheme === 'data' && !/^data:image\//i.test(raw)) return '';
  return escapeHtml(raw);
}
