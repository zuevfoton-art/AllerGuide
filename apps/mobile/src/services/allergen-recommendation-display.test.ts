import { describe, expect, it } from 'vitest';
import { getPopularAllergens } from '@allerguide/core';
import { buildAllergenPickerModel } from './allergen-recommendation-display';

describe('buildAllergenPickerModel', () => {
  it('uses popular chips when no conditions are passed', () => {
    const model = buildAllergenPickerModel({ selected: ['milk'] });
    expect(model.mode).toBe('popular');
    expect(model.groups).toEqual([]);
    expect(model.popularAllergens.map((item) => item.id)).toEqual(
      getPopularAllergens().map((item) => item.id),
    );
    expect(model.recommendedCount).toBe(1);
    expect(model.catalogCount).toBe(0);
  });

  it('groups pollinosis chips and hides food popular items (S1)', () => {
    const model = buildAllergenPickerModel({
      conditionIds: ['pollinosis'],
      selected: [],
    });
    expect(model.mode).toBe('recommended');
    expect(model.groups).toHaveLength(1);
    expect(model.groups[0]?.conditionId).toBe('pollinosis');
    const ids = model.groups[0]?.allergens.map((item) => item.id) ?? [];
    expect(ids).toContain('birch-pollen');
    expect(ids).toContain('mugwort-pollen');
    expect(ids).not.toContain('milk');
  });

  it('folds pollinosis to 8 visible chips and keeps a selected hidden allergen visible', () => {
    const collapsed = buildAllergenPickerModel({
      conditionIds: ['pollinosis'],
      selected: [],
    });
    expect(collapsed.groups[0]?.allergens).toHaveLength(13);
    expect(collapsed.groups[0]?.visibleAllergens).toHaveLength(8);
    expect(collapsed.groups[0]?.hiddenCount).toBe(5);
    expect(collapsed.groups[0]?.visibleAllergens.map((item) => item.id)).toEqual([
      'birch-pollen',
      'alder-pollen',
      'grass-pollen',
      'mugwort-pollen',
      'ragweed-pollen',
      'olive-pollen',
      'hazel-pollen',
      'oak-pollen',
    ]);

    const withWillow = buildAllergenPickerModel({
      conditionIds: ['pollinosis'],
      selected: ['willow-pollen'],
    });
    expect(withWillow.groups[0]?.visibleAllergens.map((item) => item.id)).toContain('willow-pollen');
    expect(withWillow.groups[0]?.hiddenCount).toBe(4);
    expect(withWillow.extraSelectedIds).toEqual([]);
  });

  it('keeps a selected allergen after the type is removed (S5)', () => {
    const selected = ['mugwort-pollen', 'milk'];
    const withPollinosis = buildAllergenPickerModel({
      conditionIds: ['pollinosis'],
      selected,
    });
    expect(withPollinosis.extraSelectedIds).toEqual(['milk']);
    expect(withPollinosis.recommendedCount).toBe(1);
    expect(withPollinosis.catalogCount).toBe(1);

    const afterRemoval = buildAllergenPickerModel({
      conditionIds: ['food'],
      selected,
    });
    expect(afterRemoval.groups[0]?.allergens.map((item) => item.id)).toContain('milk');
    expect(afterRemoval.extraSelectedIds).toEqual(['mugwort-pollen']);
    expect(selected).toEqual(['mugwort-pollen', 'milk']);
  });

  it('falls back to popular for other-only (S4)', () => {
    const model = buildAllergenPickerModel({
      conditionIds: ['other'],
      selected: ['penicillin'],
    });
    expect(model.mode).toBe('popular');
    expect(model.recommendedCount).toBe(1);
    expect(model.extraSelectedIds).toEqual([]);
  });
});
