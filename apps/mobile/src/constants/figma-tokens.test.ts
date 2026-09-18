import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { radii, space, density } from './layout';
import { darkColors, lightColors } from './theme';
import { fontSizes, MAX_FONT_SIZE_MULTIPLIER } from './typography';

const tokensPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../docs/figma/tokens.json');
const tokens = JSON.parse(readFileSync(tokensPath, 'utf8')) as {
  collections: {
    'Claro/Light': Record<string, string>;
    'Claro/Dark': Record<string, string>;
    Layout: { radii: Record<string, number>; space: Record<string, number>; density: Record<string, number> };
    Typography: { fontSize: Record<string, number>; maxFontSizeMultiplier: number };
  };
};

describe('docs/figma/tokens.json mirrors theme + layout', () => {
  it('matches lightColors hex keys', () => {
    const light = tokens.collections['Claro/Light'];
    for (const [key, value] of Object.entries(lightColors)) {
      expect(light[key], key).toBe(value);
    }
  });

  it('matches darkColors hex keys', () => {
    const dark = tokens.collections['Claro/Dark'];
    for (const [key, value] of Object.entries(darkColors)) {
      expect(dark[key], key).toBe(value);
    }
  });

  it('matches radii, space, density, type', () => {
    expect(tokens.collections.Layout.radii).toEqual(radii);
    expect(tokens.collections.Layout.space).toEqual({
      '1': space[1],
      '2': space[2],
      '3': space[3],
      '4': space[4],
      '6': space[6],
      '8': space[8],
      '12': space[12],
    });
    expect(tokens.collections.Layout.density).toEqual(density);
    expect(tokens.collections.Typography.fontSize).toEqual(fontSizes);
    expect(tokens.collections.Typography.maxFontSizeMultiplier).toBe(MAX_FONT_SIZE_MULTIPLIER);
  });
});
