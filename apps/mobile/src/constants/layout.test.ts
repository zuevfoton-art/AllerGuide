import { describe, expect, it } from 'vitest';
import { density, radii, WEB_TAB_BAR_HEIGHT } from './layout';

describe('brandbook layout tokens', () => {
  it('uses Figma Make zip radii (sm 6 / md 8 / lg 12 / xl 16 / xxl 24 / full 999)', () => {
    expect(radii.xs).toBe(6);
    expect(radii.sm).toBe(6);
    expect(radii.md).toBe(8);
    expect(radii.lg).toBe(12);
    expect(radii.xl).toBe(16);
    expect(radii.card).toBe(16);
    expect(radii.xxl).toBe(24);
    expect(radii.field).toBe(12);
    expect(radii.full).toBe(999);
  });

  it('uses zip CTA 48, FAB 56, tab bar 86', () => {
    expect(density.tapMinHeightPrimary).toBe(48);
    expect(density.tapMinHeightSecondary).toBe(48);
    expect(density.tapMinHeightCrisis).toBe(60);
    expect(density.tapMinHeightFab).toBe(56);
    expect(density.cardPadding).toBe(16);
    expect(WEB_TAB_BAR_HEIGHT).toBe(86);
  });
});
