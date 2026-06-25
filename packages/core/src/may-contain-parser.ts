/**
 * Parse "may contain" / trace allergen declarations from ingredient labels (D.4).
 * Supports RU and EN regulatory phrasing.
 */

export interface MayContainSegment {
  /** Full matched phrase including the allergen list. */
  raw: string;
  /** Extracted allergen terms (comma/and-separated). */
  terms: string[];
}

const MAY_CONTAIN_PATTERNS: RegExp[] = [
  // RU
  /может\s+содержать\s+([^.;]+)/gi,
  /может\s+присутствовать\s+([^.;]+)/gi,
  /следы\s+([^.;]+)/gi,
  /возможно\s+содержание\s+([^.;]+)/gi,
  // EN
  /may\s+contain(?:\s+traces\s+of)?\s+([^.;]+)/gi,
  /traces\s+of\s+([^.;]+)/gi,
  /produced\s+in\s+a\s+facility\s+that\s+also\s+processes\s+([^.;]+)/gi,
  /manufactured\s+on\s+equipment\s+shared\s+with\s+([^.;]+)/gi,
];

const TERM_SPLIT = /\s*(?:,|\/|&|\+)\s*|\s+(?:и|and)\s+/i;

function cleanTerm(term: string): string {
  return term
    .trim()
    .replace(/^[\s"'«»]+|[\s"'«»]+$/g, '')
    .replace(/\s+/g, ' ');
}

function splitTerms(fragment: string): string[] {
  return fragment
    .split(TERM_SPLIT)
    .map(cleanTerm)
    .filter((term) => term.length > 1);
}

/**
 * Extract may-contain / trace segments from free-form label text.
 */
export function parseMayContainSegments(text: string): MayContainSegment[] {
  const segments: MayContainSegment[] = [];
  const seen = new Set<string>();

  for (const pattern of MAY_CONTAIN_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const fragment = match[1]?.trim() ?? '';
      if (!fragment) continue;
      const key = fragment.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const terms = splitTerms(fragment);
      if (terms.length === 0) continue;

      segments.push({ raw: match[0].trim(), terms });
    }
  }

  return segments;
}

/**
 * Remove parsed may-contain phrases so declared ingredients can be scanned separately.
 */
export function stripMayContainPhrases(text: string): string {
  let cleaned = text;
  for (const pattern of MAY_CONTAIN_PATTERNS) {
    pattern.lastIndex = 0;
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+\./g, '.')
    .replace(/\.+/g, '.')
    .trim();
}

/**
 * Flat list of trace allergen terms from label text.
 */
export function extractMayContainTerms(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const segment of parseMayContainSegments(text)) {
    for (const term of segment.terms) {
      const key = term.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(term);
    }
  }

  return out;
}
