import { describe, expect, it } from 'vitest';
import {
  buildDishVisionPrompt,
  dishVisionToScanText,
  parseDishVisionResponse,
  shouldUseDishVisionForOcrText,
} from './dish-vision';

describe('dish vision domain', () => {
  it('builds a JSON-only prompt with dishName and ingredients', () => {
    const prompt = buildDishVisionPrompt('ru');
    expect(prompt).toContain('dishName');
    expect(prompt).toContain('ingredients');
    expect(prompt).toContain('confidence');
  });

  it('parses a clean vision JSON payload', () => {
    const result = parseDishVisionResponse(
      JSON.stringify({
        dishName: 'Оливье',
        ingredients: ['картофель', 'яйцо', 'майонез', 'колбаса'],
        confidence: 'medium',
        notes: 'Оценка по виду',
      }),
    );
    expect(result?.dishName).toBe('Оливье');
    expect(result?.ingredients).toContain('яйцо');
    expect(result?.confidence).toBe('medium');
  });

  it('parses fenced JSON and rejects empty non-food payloads', () => {
    expect(
      parseDishVisionResponse('```json\n{"dishName":"Паста карбонара","ingredients":["яйцо","бекон"],"confidence":"high"}\n```')
        ?.dishName,
    ).toBe('Паста карбонара');
    expect(
      parseDishVisionResponse(
        JSON.stringify({ dishName: '', ingredients: [], confidence: 'low', notes: 'not food' }),
      ),
    ).toBeNull();
  });

  it('flattens vision result into scan text', () => {
    expect(
      dishVisionToScanText({
        dishName: 'Борщ',
        ingredients: ['свекла', 'сметана'],
        confidence: 'high',
      }),
    ).toBe('Борщ, свекла, сметана');
  });

  it('detects when OCR text is too sparse for dish lookup', () => {
    expect(shouldUseDishVisionForOcrText('')).toBe(true);
    expect(shouldUseDishVisionForOcrText(' ')).toBe(true);
    expect(shouldUseDishVisionForOcrText('Оливье')).toBe(false);
  });
});
