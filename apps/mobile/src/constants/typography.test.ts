import { describe, expect, it } from 'vitest';
import { MAX_FONT_SIZE_MULTIPLIER, fontSizes, scaledTextProps } from './typography';

describe('typography policy', () => {
  it('keeps system font scaling on and caps the multiplier', () => {
    expect(scaledTextProps.allowFontScaling).toBe(true);
    expect(MAX_FONT_SIZE_MULTIPLIER).toBe(1.4);
    expect(scaledTextProps.maxFontSizeMultiplier).toBe(MAX_FONT_SIZE_MULTIPLIER);
  });

  it('uses caption as the smallest token (no 9px footnote size)', () => {
    expect(fontSizes.caption).toBe(11);
    expect(Math.min(...Object.values(fontSizes))).toBe(fontSizes.caption);
  });
});
