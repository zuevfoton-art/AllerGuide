import { describe, expect, it } from 'vitest';
import { buildScanPrompt, parseLlmScanResponse } from './smart-scan';

describe('smart scan', () => {
  it('builds structured prompt', () => {
    const prompt = buildScanPrompt({
      mode: 'product',
      text: 'молоко, сахар',
      allergens: ['Молоко'],
      productName: 'Йогурт',
    });
    expect(prompt).toContain('Молоко');
    expect(prompt).toContain('молоко, сахар');
  });

  it('parses llm json response', () => {
    const result = parseLlmScanResponse(
      JSON.stringify({
        verdict: 'Есть совпадения',
        reason: 'Найдено молоко',
        matches: ['Молоко'],
        crossMatches: [],
        level: 'high',
      }),
      'product',
      ['milk'],
      'Йогурт',
    );

    expect(result?.level).toBe('high');
    expect(result?.matches).toEqual(['Молоко']);
    expect(result?.source).toBe('llm');
  });

  it('parses markdown-fenced json from YandexGPT-style replies', () => {
    const fenced = `\`\`\`
{"verdict":"high","reason":"direct match","matches":["молоко"],"crossMatches":[],"level":"high"}
\`\`\``;
    const result = parseLlmScanResponse(fenced, 'product', ['milk']);
    expect(result?.level).toBe('high');
    expect(result?.source).toBe('llm');
  });
});
