import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const ONBOARDING_ASSETS = path.resolve(__dirname, '../../../assets/onboarding');

/** Phase 3: each intro slide has its own raster art (no map→scanner / sos→care reuse). */
const REQUIRED_SLIDE_ART = ['profile', 'scanner', 'care', 'map', 'sos'] as const;

describe('OnboardingSlideImage assets', () => {
  it('ships dedicated PNG art for every intro slide key', () => {
    const files = new Set(readdirSync(ONBOARDING_ASSETS));
    for (const key of REQUIRED_SLIDE_ART) {
      expect(files.has(`${key}.png`), `missing assets/onboarding/${key}.png`).toBe(true);
    }
  });
});
