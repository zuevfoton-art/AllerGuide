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

describe('theme contrast', () => {
  it('keeps the brand slogan (head on bg) at AA for normal text', () => {
    expect(contrastRatio(lightColors.head, lightColors.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkColors.head, darkColors.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('records the primary-button pair as a documented exception', () => {
    const light = contrastRatio(lightColors.onAccent, lightColors.accent);
    const dark = contrastRatio(darkColors.onAccent, darkColors.accent);
    expect(light).toBeLessThan(4.5);
    expect(dark).toBeLessThan(4.5);
    expect(BRAND_BUTTON_EXCEPTION.reason).toContain('§13');
  });
});
