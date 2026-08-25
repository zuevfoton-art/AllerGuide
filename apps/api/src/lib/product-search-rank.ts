import {
  isStrongCatalogMatch,
  scoreCatalogProductHit,
  type CatalogProductScoreInput,
} from '@allerguide/core';

export function rankLocalCatalogProducts<T extends CatalogProductScoreInput>(
  rows: T[],
  query: string,
): T[] {
  return rows
    .map((row) => ({ row, score: scoreCatalogProductHit(query, row) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((item) => item.row);
}

/** Strong name matches skip the OFF fallback; hashes and weak ILIKE hits do not. */
export function hasStrongLocalProductMatch(
  rows: CatalogProductScoreInput[],
  query: string,
): boolean {
  return rows.some((row) => isStrongCatalogMatch(scoreCatalogProductHit(query, row)));
}
