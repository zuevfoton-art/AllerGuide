import { afterEach, describe, expect, it } from 'vitest';
import {
  GOOGLE_PLACES_CATEGORIES,
  includedPrimaryTypesForAutocomplete,
  includedTypesForCategories,
  isGooglePlacesConfigured,
  resolvePlacesApiKey,
} from './google-places-shared';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('includedPrimaryTypesForAutocomplete', () => {
  it('keeps a single category under the Google five-type cap', () => {
    expect(includedPrimaryTypesForAutocomplete(['pharmacy'])).toEqual(['pharmacy', 'drugstore']);
  });

  it('omits the filter when all map categories expand past five types', () => {
    expect(includedTypesForCategories(GOOGLE_PLACES_CATEGORIES).length).toBeGreaterThan(5);
    expect(includedPrimaryTypesForAutocomplete(GOOGLE_PLACES_CATEGORIES)).toBeUndefined();
  });
});

describe('Places API key isolation', () => {
  it('does not treat GOOGLE_POLLEN_API_KEY as a Places credential', () => {
    process.env.MAP_PLACES_ENABLED = 'true';
    process.env.GOOGLE_POLLEN_API_KEY = 'pollen-only-key';
    delete process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GOOGLE_MAPS_SERVER_API_KEY;

    expect(isGooglePlacesConfigured()).toBe(false);
    expect(() => resolvePlacesApiKey()).toThrow('Google Places API key is not configured');
  });
});
