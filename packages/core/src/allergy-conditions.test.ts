import { describe, expect, it } from 'vitest';
import {
  OTHER_CONDITION_LABEL_MAX_LENGTH,
  normalizeOtherConditionLabel,
} from './allergy-conditions';

describe('allergy-conditions', () => {
  it('normalizes other-condition free-text labels', () => {
    expect(normalizeOtherConditionLabel('  латекс  ')).toBe('латекс');
    expect(normalizeOtherConditionLabel(null)).toBe('');
    expect(normalizeOtherConditionLabel(undefined)).toBe('');
  });

  it('clamps other-condition labels to max length', () => {
    const long = 'x'.repeat(OTHER_CONDITION_LABEL_MAX_LENGTH + 40);
    expect(normalizeOtherConditionLabel(long)).toHaveLength(OTHER_CONDITION_LABEL_MAX_LENGTH);
  });
});
