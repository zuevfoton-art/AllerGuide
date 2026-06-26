import { describe, expect, it } from 'vitest';
import { computeCrossReactionWellnessPenalty } from './wellness-cross-reactions';

describe('wellness-cross-reactions (B.6)', () => {
  it('adds penalty when birch pollen is elevated for birch-allergic profile', () => {
    const result = computeCrossReactionWellnessPenalty(['birch-pollen'], [
      { allergenId: 'birch-pollen', tier: 'high' },
    ]);
    expect(result.penalty).toBeGreaterThan(0);
    expect(result.matches.some((m) => m.allergen.id === 'apple')).toBe(true);
  });

  it('skips penalty when pollen tier is low', () => {
    const result = computeCrossReactionWellnessPenalty(['birch-pollen'], [
      { allergenId: 'birch-pollen', tier: 'low' },
    ]);
    expect(result.penalty).toBe(0);
    expect(result.matches).toHaveLength(0);
  });
});
