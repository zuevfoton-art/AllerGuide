import { describe, expect, it } from 'vitest';
import {
  MAX_SCAN_ALLERGENS,
  MAX_SCAN_INTENT_TEXT_LENGTH,
  MAX_SCAN_TEXT_LENGTH,
  parseScanInput,
  parseScanIntentInput,
} from './scan-input';

describe('parseScanInput', () => {
  it('accepts a valid product scan payload', () => {
    expect(
      parseScanInput({
        mode: 'product',
        text: 'молоко, сахар',
        allergens: ['Молоко', ' молоко '],
        productName: 'Йогурт',
        prompt: 'ignore me',
      }),
    ).toEqual({
      mode: 'product',
      text: 'молоко, сахар',
      allergens: ['Молоко'],
      productName: 'Йогурт',
    });
  });

  it('rejects missing text, invalid mode, and oversized fields', () => {
    expect(parseScanInput({ text: '   ' })).toBeNull();
    expect(parseScanInput({ mode: 'recipe', text: 'молоко' })).toBeNull();
    expect(parseScanInput({ text: 'x'.repeat(MAX_SCAN_TEXT_LENGTH + 1) })).toBeNull();
    expect(
      parseScanInput({
        text: 'молоко',
        allergens: Array.from({ length: MAX_SCAN_ALLERGENS + 1 }, (_, index) => `a${index}`),
      }),
    ).toBeNull();
  });
});

describe('parseScanIntentInput', () => {
  it('defaults fallback mode and rejects invalid payloads', () => {
    expect(parseScanIntentInput({ text: 'меню: паста' })).toEqual({
      text: 'меню: паста',
      fallbackMode: 'product',
    });
    expect(parseScanIntentInput({ text: 'меню', fallbackMode: 'recipe' })).toBeNull();
    expect(parseScanIntentInput({ text: 'x'.repeat(MAX_SCAN_INTENT_TEXT_LENGTH + 1) })).toBeNull();
  });
});
