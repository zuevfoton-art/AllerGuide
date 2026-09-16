import { describe, expect, it } from 'vitest';
import { density, radii } from './layout';

describe('brandbook layout tokens', () => {
  it('uses softer institutional radii and a field radius', () => {
    expect(radii.xs).toBe(6);
    expect(radii.sm).toBe(10);
    expect(radii.md).toBe(16);
    expect(radii.lg).toBe(24);
    expect(radii.xl).toBe(32);
    expect(radii.field).toBe(36);
    expect(radii.full).toBe(9999);
  });

  it('uses v2 button and FAB tap heights', () => {
    expect(density.tapMinHeightPrimary).toBe(52);
    expect(density.tapMinHeightSecondary).toBe(48);
    expect(density.tapMinHeightCrisis).toBe(60);
    expect(density.tapMinHeightFab).toBe(56);
  });
});
