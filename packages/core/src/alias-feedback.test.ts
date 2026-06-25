import { describe, expect, it, beforeEach } from 'vitest';
import {
  enqueueAliasFeedback,
  listAliasFeedback,
  resetAliasFeedbackQueue,
  shouldSuggestAliasFeedback,
} from './alias-feedback';

describe('alias-feedback', () => {
  beforeEach(() => {
    resetAliasFeedbackQueue();
  });

  it('enqueues feedback entries', () => {
    const entry = enqueueAliasFeedback({ term: 'каштановый мед', context: 'scanner' });
    expect(entry.status).toBe('pending');
    expect(listAliasFeedback('pending')).toHaveLength(1);
  });

  it('flags unmapped terms for feedback', () => {
    expect(shouldSuggestAliasFeedback('каштановый мед')).toBe(true);
    expect(shouldSuggestAliasFeedback('milk')).toBe(false);
  });
});
