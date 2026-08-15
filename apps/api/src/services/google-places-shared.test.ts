import { describe, expect, it } from 'vitest';
import {
  GOOGLE_PLACES_CATEGORIES,
  includedPrimaryTypesForAutocomplete,
  includedTypesForCategories,
} from './google-places-shared';

describe('includedPrimaryTypesForAutocomplete', () => {
  it('keeps a single category under the Google five-type cap', () => {
    expect(includedPrimaryTypesForAutocomplete(['pharmacy'])).toEqual(['pharmacy', 'drugstore']);
  });

  it('omits the filter when all map categories expand past five types', () => {
    expect(includedTypesForCategories(GOOGLE_PLACES_CATEGORIES).length).toBeGreaterThan(5);
    expect(includedPrimaryTypesForAutocomplete(GOOGLE_PLACES_CATEGORIES)).toBeUndefined();
  });
});
