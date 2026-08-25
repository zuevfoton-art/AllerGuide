import { describe, expect, it } from 'vitest';
import {
  damerauLevenshtein,
  isPlaceholderProductName,
  isStrongCatalogMatch,
  isUsefulCatalogMatch,
  normalizeSearchText,
  scoreCatalogProductHit,
  scoreCatalogProductName,
  scoreNameMatch,
  stemSearchToken,
  tokenizeSearchText,
  tokensFuzzyEqual,
  transliterateToCyrillic,
  transliterateToLatin,
} from './name-matching';

describe('normalizeSearchText', () => {
  it('strips quotes, digits, units, and punctuation', () => {
    expect(normalizeSearchText('«Оливье» 250 г')).toBe('оливье');
    expect(normalizeSearchText('  Борщ,   домашний! ')).toBe('борщ домашний');
  });

  it('collapses 3+ repeated letters and maps ё to е', () => {
    expect(normalizeSearchText('ёлка')).toBe('елка');
    expect(normalizeSearchText('спагетттти')).toBe('спагетти');
  });
});

describe('tokenizeSearchText', () => {
  it('drops everyday filler around a dish name', () => {
    expect(tokenizeSearchText('Съел борщ на обед')).toEqual(['борщ']);
  });
});

describe('stemSearchToken', () => {
  it('strips common Russian endings without collapsing short stems', () => {
    expect(stemSearchToken('борща')).toBe('борщ');
    expect(stemSearchToken('котлеты')).toBe('котлет');
    expect(stemSearchToken('щи')).toBe('щи');
  });
});

describe('transliteration', () => {
  it('round-trips simple Slavic tokens', () => {
    expect(transliterateToCyrillic('plov')).toBe('плов');
    expect(transliterateToLatin('плов')).toBe('plov');
  });
});

describe('damerauLevenshtein', () => {
  it('counts a transposition as one edit', () => {
    expect(damerauLevenshtein('карбонара', 'карбонара')).toBe(0);
    expect(damerauLevenshtein('карбонора', 'карбонара')).toBe(1);
    expect(damerauLevenshtein('олвиье', 'оливье')).toBe(1);
  });
});

describe('tokensFuzzyEqual', () => {
  it('rejects typos on tokens shorter than 4 letters', () => {
    expect(tokensFuzzyEqual('щи', 'чай')).toBe(false);
    expect(tokensFuzzyEqual('уха', 'ухи')).toBe(false);
  });

  it('allows one edit on mid-length tokens', () => {
    expect(tokensFuzzyEqual('оливье', 'оливьэ')).toBe(true);
    expect(tokensFuzzyEqual('карбонара', 'карбонора')).toBe(true);
  });
});

describe('scoreNameMatch', () => {
  it('scores exact, token, fuzzy, and translit matches', () => {
    expect(scoreNameMatch('борщ', 'борщ')?.matchKind).toBe('exact');
    expect(scoreNameMatch('carbonara', 'pasta carbonara')?.score).toBeGreaterThanOrEqual(40);
    expect(scoreNameMatch('карбонора', 'карбонара')?.matchKind).toBe('fuzzy');
    expect(scoreNameMatch('plov', 'плов')?.matchKind).toBe('translit');
  });

  it('returns null for unrelated text', () => {
    expect(scoreNameMatch('неизвестное блюдо xyz', 'борщ')).toBeNull();
  });
});

describe('isPlaceholderProductName', () => {
  it('flags academic hash names and accepts real titles', () => {
    expect(isPlaceholderProductName('1JNtNyz')).toBe(true);
    expect(isPlaceholderProductName('Spaghetti Bolognese')).toBe(false);
    expect(isPlaceholderProductName('борщ')).toBe(false);
  });
});

describe('scoreCatalogProductHit', () => {
  it('matches a Cyrillic query to an English OFF title', () => {
    const score = scoreCatalogProductName('спагетти болоньезе', 'Spaghetti Bolognese');
    expect(score).toBeGreaterThanOrEqual(40);
    expect(isUsefulCatalogMatch(score)).toBe(true);
  });

  it('ignores food-allergy hashes even when ILIKE would have returned them', () => {
    expect(scoreCatalogProductHit('milk', { name: '1JNtNyz', source: 'food-allergy-db' })).toBe(0);
    expect(scoreCatalogProductName('milk', '1JNtNyz')).toBe(0);
    expect(isStrongCatalogMatch(0)).toBe(false);
  });
});
