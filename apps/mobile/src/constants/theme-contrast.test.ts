import { describe, expect, it, vi } from 'vitest';
import { contrastRatio } from './theme-contrast';
import { darkColors, lightColors } from './theme';

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

/**
 * Documented exception: white on brand accent fails AA 4.5:1
 * (light ≈ 3.32, dark ≈ 2.44). See docs/ux-audit-2026-08.md §13.
 * Do not treat this pair as a gate until product picks a fill shade.
 */
const BRAND_BUTTON_EXCEPTION = {
  reason: 'ux-audit-2026-08 §13 — onAccent on accent is a brand exception',
};

/** Zip `textSecondary` `#6B7C75` on warm bg is below AA 4.5; keep the Figma hex. */
const FIGMA_ZIP_MUTED_EXCEPTION = {
  reason: 'Figma Make zip code.txt — textSecondary #6B7C75 is a documented AA exception',
};

const AA = 4.5;

function expectReadable(foreground: string, background: string, label: string) {
  expect(contrastRatio(foreground, background), label).toBeGreaterThanOrEqual(AA);
}

describe('theme contrast', () => {
  it('keeps the brand slogan (head on bg) at AA for normal text', () => {
    expectReadable(lightColors.head, lightColors.bg, 'light head/bg');
    expectReadable(darkColors.head, darkColors.bg, 'dark head/bg');
  });

  it('keeps body and muted text readable on bg and card in both themes', () => {
    for (const [name, colors] of [
      ['light', lightColors],
      ['dark', darkColors],
    ] as const) {
      for (const surface of ['bg', 'card'] as const) {
        expectReadable(colors.text, colors[surface], `${name} text/${surface}`);
        expectReadable(colors.head, colors[surface], `${name} head/${surface}`);
        if (name === 'dark') {
          expectReadable(colors.textSecondary, colors[surface], `${name} textSecondary/${surface}`);
          expectReadable(colors.textMuted, colors[surface], `${name} textMuted/${surface}`);
        }
      }
    }
  });

  it('records zip muted text as a documented AA exception on light surfaces', () => {
    const secondaryOnBg = contrastRatio(lightColors.textSecondary, lightColors.bg);
    const mutedOnCard = contrastRatio(lightColors.textMuted, lightColors.card);
    expect(secondaryOnBg).toBeLessThan(AA);
    expect(mutedOnCard).toBeLessThan(AA);
    expect(FIGMA_ZIP_MUTED_EXCEPTION.reason).toContain('#6B7C75');
  });

  it('records the primary-button pair as a documented exception', () => {
    const light = contrastRatio(lightColors.onAccent, lightColors.accent);
    const dark = contrastRatio(darkColors.onAccent, darkColors.accent);
    expect(light).toBeLessThan(AA);
    expect(dark).toBeLessThan(AA);
    expect(BRAND_BUTTON_EXCEPTION.reason).toContain('§13');
  });
});
