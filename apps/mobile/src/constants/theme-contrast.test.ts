import { describe, expect, it, vi } from 'vitest';
import { contrastRatio } from './theme-contrast';
import { darkColors, lightColors } from './theme';

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

/**
 * Brand primary now uses AA-safe Moss (`#6E6E58`). Historical ux-audit §13
 * applied to lighter Claro/Nordic accents; keep the note for doc cross-links.
 */
const BRAND_BUTTON_NOTE = {
  reason: 'ux-audit-2026-08 §13 — superseded by Moss AA primary in Earth Wellness',
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

  it('keeps white-on-Moss primary and dark onAccent/accent at AA', () => {
    expectReadable(lightColors.onAccent, lightColors.accent, 'light onAccent/accent');
    expectReadable(darkColors.onAccent, darkColors.accent, 'dark onAccent/accent');
    // Retained so callers that still reference the audit note do not break.
    expect(BRAND_BUTTON_NOTE.reason).toContain('§13');
  });
});
