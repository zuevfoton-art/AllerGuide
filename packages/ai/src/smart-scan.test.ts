import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildScanPrompt, parseLlmScanResponse, runLlmScan, runSmartScan } from './smart-scan';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

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

  it('returns null when LLM fetch throws so smart scan can fall back', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Network request failed')) as unknown as typeof fetch;

    const llm = await runLlmScan({
      endpoint: 'https://example.test/api/scan',
      mode: 'product',
      text: 'молоко',
      allergens: ['Молоко'],
    });
    expect(llm).toBeNull();
  });

  it('falls back to keyword mock when LLM endpoint is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Network request failed')) as unknown as typeof fetch;

    const result = await runSmartScan({
      mode: 'product',
      text: 'молоко',
      profile: { allergies: JSON.stringify(['Молоко']) },
      llmEndpoint: 'https://example.test/api/scan',
    });

    expect(result.source).not.toBe('llm');
    expect(result.matches.length + result.crossMatches.length).toBeGreaterThan(0);
  });

  it('aborts hung LLM requests and soft-fails to null', async () => {
    global.fetch = vi.fn((_url: string, opts: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        opts.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    }) as unknown as typeof fetch;

    const llm = await runLlmScan({
      endpoint: 'https://example.test/api/scan',
      mode: 'product',
      text: 'молоко',
      allergens: [],
      timeoutMs: 20,
    });
    expect(llm).toBeNull();
  });
});
