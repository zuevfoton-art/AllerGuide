import { describe, expect, it, vi } from 'vitest';
import { contrastRatio } from './theme-contrast';
import { darkColors, lightColors } from './theme';

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

/**
 * Brand primary is recognition green with petrol ink (`#004F70` on `#7DCD72`).
 * White-on-green fails AA; brandbook uses navy-on-green.
 */
const BRAND_BUTTON_NOTE = {
  reason: 'ux-audit-2026-08 §13 — superseded by petrol-on-green AA in brandbook 50/35/15',
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
        expectReadable(colors.textSecondary, colors[surface], `${name} textSecondary/${surface}`);
        expectReadable(colors.textMuted, colors[surface], `${name} textMuted/${surface}`);
        expectReadable(colors.head, colors[surface], `${name} head/${surface}`);
      }
    }
  });

  it('keeps petrol-on-green primary and dark onAccent/accent at AA', () => {
    expectReadable(lightColors.onAccent, lightColors.accent, 'light onAccent/accent');
    expectReadable(darkColors.onAccent, darkColors.accent, 'dark onAccent/accent');
    expect(BRAND_BUTTON_NOTE.reason).toContain('§13');
  });
});
