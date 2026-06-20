import { describe, expect, it } from 'vitest';
import { buildScanPrompt, parseLlmScanResponse } from '@allerguide/ai';

describe('scan route helpers', () => {
  it('builds llm prompt for allergen analysis', () => {
    const prompt = buildScanPrompt({
      mode: 'product',
      text: 'молоко',
      allergens: ['Молоко'],
    });
    expect(prompt).toContain('молоко');
  });

  it('parses llm json into scan result', () => {
    const parsed = parseLlmScanResponse(
      '{"verdict":"ok","reason":"none","matches":[],"crossMatches":[],"level":"low"}',
      'product',
    );
    expect(parsed?.level).toBe('low');
  });
});
