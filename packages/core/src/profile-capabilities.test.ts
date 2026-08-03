import { describe, expect, it } from 'vitest';
import {
  buildProfileCapabilities,
  getDefaultReportBlockIdsForCapabilities,
  getGatingConditions,
  getHomeQuickActionsForCapabilities,
  getMissingConditionsForAllergens,
  getDefaultScannerModeForCapabilities,
} from './profile-capabilities';
import { filterDiarySections } from './diary-profile';
import { DIARY_SECTIONS } from './diary';
import type { Profile } from './types';

function profile(allergies: string[]): Pick<Profile, 'allergies'> {
  return { allergies: JSON.stringify(allergies) };
}

describe('profile-capabilities explicit-first gating', () => {
  it('S1: food-only with birch pollen allergen hides ASIT and peak flow', () => {
    const caps = buildProfileCapabilities({
      profile: profile(['milk', 'birch-pollen']),
      explicitConditions: ['food'],
    });

    expect(caps.modules.asit).toBe(false);
    expect(caps.modules.peakFlow).toBe(false);
    expect(caps.diarySectionTypes).not.toContain('АСИТ');
    expect(caps.diarySectionTypes).not.toContain('Пикфлоуметрия');
    expect(caps.reminders.pollen).toBe(false);
    expect(caps.reminders.asit).toBe(false);
    expect(caps.reportBlockIds).not.toContain('asit');
    expect(caps.reportBlockIds).not.toContain('peakflow');
  });

  it('S2: explicit pollinosis enables ASIT but not peak flow', () => {
    const caps = buildProfileCapabilities({
      profile: profile(['birch-pollen']),
      explicitConditions: ['pollinosis'],
    });

    expect(caps.modules.asit).toBe(true);
    expect(caps.modules.peakFlow).toBe(false);
    expect(caps.diarySectionTypes).toContain('АСИТ');
    expect(caps.diarySectionTypes).not.toContain('Пикфлоуметрия');
    expect(caps.reminders.pollen).toBe(true);
    expect(caps.recommendedScaleIds).toContain('aria-lite');
  });

  it('S3: explicit asthma enables peak flow but not ASIT', () => {
    const caps = buildProfileCapabilities({
      profile: profile(['birch-pollen']),
      explicitConditions: ['asthma'],
    });

    expect(caps.modules.peakFlow).toBe(true);
    expect(caps.modules.asit).toBe(false);
    expect(caps.diarySectionTypes).toContain('Пикфлоуметрия');
    expect(caps.diarySectionTypes).not.toContain('АСИТ');
    expect(caps.reminders.act).toBe(true);
    expect(caps.reminders.pollen).toBe(false);
  });

  it('S4: asthma + pollinosis enables both modules', () => {
    const caps = buildProfileCapabilities({
      profile: profile(['birch-pollen']),
      explicitConditions: ['asthma', 'pollinosis'],
    });

    expect(caps.modules.peakFlow).toBe(true);
    expect(caps.modules.asit).toBe(true);
    expect(caps.recommendedScaleIds).toEqual(
      expect.arrayContaining(['aria-lite', 'act']),
    );
  });

  it('S5: drug profile defaults scanner to medicine', () => {
    const caps = buildProfileCapabilities({
      profile: profile(['penicillin']),
      explicitConditions: ['drug'],
    });

    expect(caps.defaultScannerMode).toBe('medicine');
    expect(caps.modules.drugFocus).toBe(true);
    expect(caps.homeQuickActions).toContain('medicine');
  });

  it('S6: insect explicit enables insect sting section only', () => {
    const caps = buildProfileCapabilities({
      profile: profile(['bee-venom']),
      explicitConditions: ['insect'],
    });

    expect(caps.modules.insectSting).toBe(true);
    expect(caps.diarySectionTypes).toContain('Укус насекомого');
    expect(caps.reportBlockIds).toContain('insect');
  });

  it('S7: dermatitis enables skin focus and cosmetics scanner default', () => {
    const caps = buildProfileCapabilities({
      profile: profile(['milk']),
      explicitConditions: ['dermatitis'],
    });

    expect(caps.modules.skinFocus).toBe(true);
    expect(caps.defaultScannerMode).toBe('cosmetics');
    expect(caps.recommendedScaleIds).toContain('scorad-lite');
  });

  it('S8: household without pollen allergens skips ASIT and pollen reminders', () => {
    const caps = buildProfileCapabilities({
      profile: profile(['dust-mite']),
      explicitConditions: ['household'],
    });

    expect(caps.modules.asit).toBe(false);
    expect(caps.modules.peakFlow).toBe(false);
    expect(caps.reminders.pollen).toBe(false);
  });

  it('food-only never enables ASIT or peak flow', () => {
    const caps = buildProfileCapabilities({
      profile: profile(['milk', 'egg']),
      explicitConditions: ['food'],
    });
    expect(caps.modules.asit).toBe(false);
    expect(caps.modules.peakFlow).toBe(false);
    expect(caps.homeQuickActions).not.toContain('asit');
    expect(caps.homeQuickActions).not.toContain('peakFlow');
  });

  it('infers conditions for hints but does not gate modules', () => {
    const caps = buildProfileCapabilities({
      profile: profile(['birch-pollen']),
      explicitConditions: ['food'],
    });

    expect(caps.inferredConditions).toEqual(
      expect.arrayContaining(['pollinosis', 'rhinitis']),
    );
    expect(caps.modules.asit).toBe(false);
  });

  it('getGatingConditions returns explicit only', () => {
    expect(getGatingConditions(['food'])).toEqual(['food']);
  });

  it('getMissingConditionsForAllergens suggests pollinosis for birch pollen', () => {
    const missing = getMissingConditionsForAllergens(['birch-pollen'], ['food']);
    expect(missing).toContain('pollinosis');
  });

  it('food-only home quick actions exclude medicine when no clinical types', () => {
    const caps = buildProfileCapabilities({
      profile: profile(['milk']),
      explicitConditions: ['food'],
    });
    expect(getHomeQuickActionsForCapabilities(caps)).toEqual(['symptoms', 'food']);
  });
});

describe('filterDiarySections with gating conditions', () => {
  it('hides peak flow and ASIT for food-only explicit profile', () => {
    const visible = filterDiarySections(DIARY_SECTIONS, ['food']).map((s) => s.type);
    expect(visible).not.toContain('Пикфлоуметрия');
    expect(visible).not.toContain('АСИТ');
  });
});

describe('report block defaults', () => {
  it('excludes peakflow and asit for food profile', () => {
    const caps = buildProfileCapabilities({
      profile: profile(['milk']),
      explicitConditions: ['food'],
    });
    const ids = getDefaultReportBlockIdsForCapabilities(caps);
    expect(ids).not.toContain('peakflow');
    expect(ids).not.toContain('asit');
    expect(ids).toContain('food');
    expect(ids).toContain('foodDrug');
  });
});

describe('scanner default mode', () => {
  it('returns product for generic environmental profile', () => {
    expect(
      getDefaultScannerModeForCapabilities({
        gatingConditions: ['pollinosis'],
        modules: { drugFocus: false } as never,
      }),
    ).toBe('product');
  });
});
