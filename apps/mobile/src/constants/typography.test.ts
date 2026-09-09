import { describe, expect, it } from 'vitest';
import {
  MAX_FONT_SIZE_MULTIPLIER,
  TEXT_SCALE_PRESETS,
  fontSizes,
  lineHeights,
  scaledTextProps,
  textStyles,
  tracking,
} from './typography';

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

  it('covers former orphan sizes 14 and 16', () => {
    expect(fontSizes.bodyMd).toBe(14);
    expect(fontSizes.h4).toBe(16);
  });

  it('pairs every font size with a line-height token', () => {
    for (const key of Object.keys(fontSizes) as (keyof typeof fontSizes)[]) {
      expect(lineHeights[key], key).toBeGreaterThan(fontSizes[key]);
    }
  });

  it('uses ~1.5 body leading and ~1.25 heading leading', () => {
    expect(lineHeights.body / fontSizes.body).toBeGreaterThanOrEqual(1.4);
    expect(lineHeights.h1 / fontSizes.h1).toBeGreaterThanOrEqual(1.2);
    expect(lineHeights.h1 / fontSizes.h1).toBeLessThan(1.35);
  });

  it('exports composed textStyles with family, size, leading, tracking', () => {
    expect(textStyles.body.fontSize).toBe(fontSizes.body);
    expect(textStyles.body.lineHeight).toBe(lineHeights.body);
    expect(textStyles.h1.letterSpacing).toBe(tracking.tight);
    expect(textStyles.label.letterSpacing).toBe(tracking.label);
  });

  it('keeps text-scale presets under the Dynamic Type cap', () => {
    expect(TEXT_SCALE_PRESETS.max).toBeLessThanOrEqual(MAX_FONT_SIZE_MULTIPLIER);
    expect(TEXT_SCALE_PRESETS.regular).toBe(1);
  });
});
