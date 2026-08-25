/**
 * Shared free-text name matching: normalize, tokenize, stem, transliterate,
 * and score candidates. Used by the dish catalog and product search.
 */

export type NameMatchKind = 'exact' | 'substring' | 'tokens' | 'fuzzy' | 'translit';

export type ScoredNameMatch = {
  score: number;
  matchKind: NameMatchKind;
};

export const NAME_MATCH_MIN_SCORE = 40;
export const CATALOG_STRONG_MATCH_SCORE = 50;
export const CATALOG_USEFUL_MATCH_SCORE = 40;
export const NAME_MATCH_AMBIGUOUS_GAP = 8;
const MIN_FUZZY_TOKEN_LENGTH = 4;
const COLLAPSE_REPEAT_LENGTH = 3;
const SHORT_FUZZY_MAX_DISTANCE = 1;
const LONG_FUZZY_MAX_DISTANCE = 2;
const LONG_FUZZY_MIN_LENGTH = 7;

const PUNCTUATION_PATTERN = /[^\p{L}\p{N}\s]+/gu;
const DIGITS_PATTERN = /\d+/g;
const WHITESPACE_PATTERN = /\s+/g;
const REPEAT_LETTER_PATTERN = /(.)\1{2,}/g;

const MEASUREMENT_TOKENS = new Set([
  'г',
  'гр',
  'грамм',
  'граммов',
  'кг',
  'мл',
  'л',
  'шт',
  'штук',
  'штука',
  'порц',
  'порция',
  'порции',
]);

const STOP_WORDS = new Set([
  'съел',
  'съела',
  'съели',
  'ела',
  'ел',
  'ели',
  'на',
  'обед',
  'завтрак',
  'ужин',
  'полдник',
  'порция',
  'порции',
  'домашний',
  'домашняя',
  'домашнее',
  'домашние',
  'свежий',
  'свежая',
  'свежее',
  'свежие',
  'блюдо',
  'продукт',
  'еда',
  'с',
  'и',
  'из',
  'для',
  'мой',
  'моя',
  'мое',
  'сегодня',
  'вчера',
  'без',
  'в',
  'во',
  'к',
  'ко',
  'по',
  'от',
  'до',
  'со',
  'или',
  'the',
  'a',
  'an',
  'and',
  'with',
  'of',
]);

/** Longest-first so `-ями` wins over `-и`. */
const RU_ENDINGS = [
  'ями',
  'ами',
  'ого',
  'его',
  'ому',
  'ему',
  'ыми',
  'ими',
  'ях',
  'ах',
  'ой',
  'ей',
  'ом',
  'ем',
  'ый',
  'ий',
  'ая',
  'яя',
  'ое',
  'ее',
  'ые',
  'ие',
  'ов',
  'ев',
  'ам',
  'ям',
  'ую',
  'юю',
  'ей',
  'ий',
  'ы',
  'и',
  'а',
  'я',
  'у',
  'ю',
  'е',
  'о',
];

const CYR_TO_LAT: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

/** Multi-letter Latin digraphs first so `shch` is not read as `s` + `h` + `ch`. */
const LAT_TO_CYR_MULTI: Array<[string, string]> = [
  ['shch', 'щ'],
  ['zh', 'ж'],
  ['kh', 'х'],
  ['ts', 'ц'],
  ['ch', 'ч'],
  ['sh', 'ш'],
  ['yu', 'ю'],
  ['ya', 'я'],
  ['yo', 'е'],
  ['ye', 'е'],
];

const LAT_TO_CYR_SINGLE: Record<string, string> = {
  a: 'а',
  b: 'б',
  c: 'к',
  d: 'д',
  e: 'е',
  f: 'ф',
  g: 'г',
  h: 'х',
  i: 'и',
  j: 'й',
  k: 'к',
  l: 'л',
  m: 'м',
  n: 'н',
  o: 'о',
  p: 'п',
  q: 'к',
  r: 'р',
  s: 'с',
  t: 'т',
  u: 'у',
  v: 'в',
  w: 'в',
  x: 'кс',
  y: 'й',
  z: 'з',
};

const HAS_CYRILLIC = /[а-яё]/i;
const HAS_LATIN = /[a-z]/i;

/**
 * Strip punctuation, quotes, digits, measurement tokens, and collapse
 * 3+ repeated letters. Does not drop stop-words — those are token-level.
 */
export function normalizeSearchText(value: string): string {
  const stripped = value
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(PUNCTUATION_PATTERN, ' ')
    .replace(DIGITS_PATTERN, ' ')
    .replace(REPEAT_LETTER_PATTERN, (_, letter: string) => letter.repeat(COLLAPSE_REPEAT_LENGTH - 1))
    .replace(WHITESPACE_PATTERN, ' ')
    .trim();

  if (!stripped) return '';

  return stripped
    .split(' ')
    .filter((token) => token.length > 0 && !MEASUREMENT_TOKENS.has(token))
    .join(' ');
}

export function transliterateToLatin(value: string): string {
  const normalized = normalizeSearchText(value);
  let out = '';
  for (const char of normalized) {
    if (char === ' ') {
      out += ' ';
      continue;
    }
    out += CYR_TO_LAT[char] ?? char;
  }
  return out;
}

export function transliterateToCyrillic(value: string): string {
  const normalized = normalizeSearchText(value);
  let out = '';
  let index = 0;
  while (index < normalized.length) {
    const char = normalized[index];
    if (char === ' ') {
      out += ' ';
      index += 1;
      continue;
    }
    const rest = normalized.slice(index);
    const multi = LAT_TO_CYR_MULTI.find(([latin]) => rest.startsWith(latin));
    if (multi) {
      out += multi[1];
      index += multi[0].length;
      continue;
    }
    out += LAT_TO_CYR_SINGLE[char] ?? char;
    index += 1;
  }
  return out;
}

/** Light Russian stem: drop a common ending when the stem stays long enough. */
export function stemSearchToken(token: string): string {
  const normalized = normalizeSearchText(token);
  if (normalized.length < 4) return normalized;
  if (!HAS_CYRILLIC.test(normalized)) return normalized;

  for (const ending of RU_ENDINGS) {
    if (!normalized.endsWith(ending)) continue;
    const stem = normalized.slice(0, -ending.length);
    if (stem.length >= 3) return stem;
  }
  return normalized;
}

export function tokenizeSearchText(value: string): string[] {
  const normalized = normalizeSearchText(value);
  if (!normalized) return [];
  return normalized.split(' ').filter((token) => token.length > 0 && !STOP_WORDS.has(token));
}

export function damerauLevenshtein(left: string, right: string): number {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      const deletion = matrix[i - 1][j] + 1;
      const insertion = matrix[i][j - 1] + 1;
      const substitution = matrix[i - 1][j - 1] + cost;
      let value = Math.min(deletion, insertion, substitution);
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
        value = Math.min(value, matrix[i - 2][j - 2] + 1);
      }
      matrix[i][j] = value;
    }
  }
  return matrix[left.length][right.length];
}

function fuzzyDistanceLimit(length: number): number {
  if (length < MIN_FUZZY_TOKEN_LENGTH) return 0;
  if (length < LONG_FUZZY_MIN_LENGTH) return SHORT_FUZZY_MAX_DISTANCE;
  return LONG_FUZZY_MAX_DISTANCE;
}

export function tokensFuzzyEqual(left: string, right: string): boolean {
  if (left === right) return true;
  const limit = fuzzyDistanceLimit(Math.min(left.length, right.length));
  if (limit === 0) return false;
  if (Math.abs(left.length - right.length) > limit) return false;
  return damerauLevenshtein(left, right) <= limit;
}

function scriptVariants(value: string): string[] {
  const normalized = normalizeSearchText(value);
  const variants = new Set<string>([normalized]);
  if (HAS_CYRILLIC.test(normalized)) variants.add(transliterateToLatin(normalized));
  if (HAS_LATIN.test(normalized)) variants.add(transliterateToCyrillic(normalized));
  return [...variants].filter(Boolean);
}

function tokensMatchPair(
  queryToken: string,
  candidateToken: string,
): { kind: NameMatchKind; fuzzy: boolean } | null {
  if (queryToken === candidateToken) return { kind: 'exact', fuzzy: false };

  const queryStem = stemSearchToken(queryToken);
  const candidateStem = stemSearchToken(candidateToken);
  if (queryStem === candidateStem) return { kind: 'tokens', fuzzy: false };

  const queryVariants = scriptVariants(queryToken);
  const candidateVariants = scriptVariants(candidateToken);
  for (const queryVariant of queryVariants) {
    for (const candidateVariant of candidateVariants) {
      if (queryVariant === candidateVariant) return { kind: 'translit', fuzzy: false };
      if (stemSearchToken(queryVariant) === stemSearchToken(candidateVariant)) {
        return { kind: 'translit', fuzzy: false };
      }
    }
  }

  if (tokensFuzzyEqual(queryToken, candidateToken) || tokensFuzzyEqual(queryStem, candidateStem)) {
    return { kind: 'fuzzy', fuzzy: true };
  }

  for (const queryVariant of queryVariants) {
    for (const candidateVariant of candidateVariants) {
      if (tokensFuzzyEqual(queryVariant, candidateVariant)) return { kind: 'fuzzy', fuzzy: true };
    }
  }

  return null;
}

function preferKind(current: NameMatchKind, next: NameMatchKind): NameMatchKind {
  const rank: Record<NameMatchKind, number> = {
    exact: 5,
    substring: 4,
    tokens: 3,
    translit: 2,
    fuzzy: 1,
  };
  return rank[next] > rank[current] ? next : current;
}

/**
 * Score how well `query` names the same thing as `candidate`.
 * Returns null when the match is too weak to use as a hit.
 */
export function scoreNameMatch(query: string, candidate: string): ScoredNameMatch | null {
  const queryNorm = normalizeSearchText(query);
  const candidateNorm = normalizeSearchText(candidate);
  if (!queryNorm || !candidateNorm) return null;

  if (queryNorm === candidateNorm) return { score: 100, matchKind: 'exact' };

  const queryVariants = scriptVariants(queryNorm);
  const candidateVariants = scriptVariants(candidateNorm);
  for (const queryVariant of queryVariants) {
    for (const candidateVariant of candidateVariants) {
      if (queryVariant === candidateVariant && queryVariant !== queryNorm) {
        return { score: 88, matchKind: 'translit' };
      }
    }
  }

  if (queryNorm.includes(candidateNorm) || candidateNorm.includes(queryNorm)) {
    const shorter = Math.min(queryNorm.length, candidateNorm.length);
    return { score: 60 + Math.min(20, shorter), matchKind: 'substring' };
  }

  for (const queryVariant of queryVariants) {
    for (const candidateVariant of candidateVariants) {
      if (queryVariant === queryNorm && candidateVariant === candidateNorm) continue;
      if (queryVariant.includes(candidateVariant) || candidateVariant.includes(queryVariant)) {
        const shorter = Math.min(queryVariant.length, candidateVariant.length);
        return { score: 55 + Math.min(15, shorter), matchKind: 'translit' };
      }
    }
  }

  const queryTokens = tokenizeSearchText(queryNorm);
  const candidateTokens = tokenizeSearchText(candidateNorm);
  if (queryTokens.length === 0 || candidateTokens.length === 0) return null;

  let matched = 0;
  let fuzzyCount = 0;
  let kind: NameMatchKind = 'tokens';
  for (const queryToken of queryTokens) {
    let best: ReturnType<typeof tokensMatchPair> = null;
    for (const candidateToken of candidateTokens) {
      const pair = tokensMatchPair(queryToken, candidateToken);
      if (!pair) continue;
      if (!best || (best.fuzzy && !pair.fuzzy)) best = pair;
    }
    if (!best) continue;
    matched += 1;
    if (best.fuzzy) fuzzyCount += 1;
    kind = preferKind(kind, best.kind);
  }

  if (matched === 0) return null;

  const coverage = matched / Math.max(queryTokens.length, candidateTokens.length);
  const queryCoverage = matched / queryTokens.length;
  if (queryCoverage < 0.5 && coverage < 0.4) return null;

  let score = Math.round(15 * matched + 40 * queryCoverage + 20 * coverage);
  if (fuzzyCount > 0) {
    score -= fuzzyCount * 6;
    kind = 'fuzzy';
  }
  if (kind === 'translit' && score < 88) score = Math.max(score, 62);

  if (score < NAME_MATCH_MIN_SCORE) return null;
  return { score: Math.min(95, score), matchKind: kind };
}

export function isAmbiguousNameRanking(topScore: number, secondScore: number | undefined): boolean {
  if (secondScore == null) return false;
  return topScore - secondScore < NAME_MATCH_AMBIGUOUS_GAP;
}

/** True when a catalog / OFF product name is a placeholder hash, not a real title. */
export function isPlaceholderProductName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 4) return true;
  if (/^[A-Za-z0-9]{6,12}$/.test(trimmed) && !/\s/.test(trimmed) && /[A-Z]/.test(trimmed) && /\d/.test(trimmed)) {
    return true;
  }
  if (/^[0-9a-f]{8,}$/i.test(trimmed)) return true;
  return false;
}

/** Name-only score for catalog / OFF rows. Placeholder hashes score 0. */
export function scoreCatalogProductName(query: string, name: string): number {
  if (!name.trim() || isPlaceholderProductName(name)) return 0;
  return scoreNameMatch(query, name)?.score ?? 0;
}

export type CatalogProductScoreInput = {
  name: string;
  allergenTags?: string[];
  ingredients?: string;
  traceTags?: string[];
  source?: string;
};

/**
 * Rank a catalog/OFF product against a typed query.
 * Food-allergy demo rows and hash names never count as a useful hit.
 */
export function scoreCatalogProductHit(query: string, product: CatalogProductScoreInput): number {
  if (product.source === 'food-allergy-db') return 0;
  const base = scoreCatalogProductName(query, product.name);
  if (base === 0) return 0;
  let score = base;
  if (product.allergenTags?.length) score += 10;
  if (product.ingredients && product.ingredients.length > 20) score += 8;
  if (product.traceTags?.length) score += 3;
  return score;
}

export function isStrongCatalogMatch(score: number): boolean {
  return score >= CATALOG_STRONG_MATCH_SCORE;
}

export function isUsefulCatalogMatch(score: number): boolean {
  return score >= CATALOG_USEFUL_MATCH_SCORE;
}
