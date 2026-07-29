import { describe, expect, it } from 'vitest';
import {
  buildScanIntentPrompt,
  parseScanIntentResponse,
  resolveScanIntentClassification,
} from './scan-intent';

describe('scan-intent', () => {
  it('builds a JSON-only classification prompt', () => {
    const prompt = buildScanIntentPrompt('Состав: молоко, сахар');
    expect(prompt).toContain('label_or_menu|visual_product');
    expect(prompt).toContain('молоко');
  });

  it('parses LLM JSON intent', () => {
    const parsed = parseScanIntentResponse(
      '{"intent":"label_or_menu","mode":"medicine"}',
    );
    expect(parsed).toEqual({ intent: 'label_or_menu', mode: 'medicine' });
  });

  it('falls back to heuristic when LLM raw is invalid', () => {
    const result = resolveScanIntentClassification({
      extraction: {
        text: 'Оливье',
        source: 'vision',
        warnings: [],
      },
      llmRaw: 'not-json',
    });
    expect(result.source).toBe('heuristic');
    expect(result.intent).toBe('visual_product');
  });

  it('prefers valid LLM classification', () => {
    const result = resolveScanIntentClassification({
      extraction: {
        text: 'Оливье',
        source: 'vision',
        warnings: [],
      },
      llmRaw: '{"intent":"label_or_menu","mode":"menu"}',
    });
    expect(result).toEqual({
      intent: 'label_or_menu',
      mode: 'menu',
      source: 'llm',
    });
  });
});
