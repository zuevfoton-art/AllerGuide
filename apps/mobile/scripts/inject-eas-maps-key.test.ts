import { describe, expect, it } from 'vitest';
import {
  isGoogleMapsApiKey,
  resolveMapsApiKey,
  upsertGradleMapsKey,
} from './inject-eas-maps-key.mjs';

describe('inject-eas-maps-key', () => {
  it('accepts AIza keys and rejects error prose', () => {
    expect(isGoogleMapsApiKey('AIzaSyA-valid_Google-Maps_Key12')).toBe(true);
    expect(resolveMapsApiKey('The bearer token is invalid.')).toEqual({
      ok: false,
      key: '',
    });
    expect(resolveMapsApiKey('')).toEqual({ ok: true, key: '' });
  });

  it('upserts GOOGLE_MAPS_API_KEY in gradle.properties text', () => {
    expect(upsertGradleMapsKey('org.gradle.parallel=true\n', 'AIzaSyA-valid_Google-Maps_Key12')).toBe(
      'org.gradle.parallel=true\nGOOGLE_MAPS_API_KEY=AIzaSyA-valid_Google-Maps_Key12\n',
    );
    expect(
      upsertGradleMapsKey(
        'GOOGLE_MAPS_API_KEY=old\norg.gradle.parallel=true\n',
        'AIzaSyA-valid_Google-Maps_Key12',
      ),
    ).toBe('GOOGLE_MAPS_API_KEY=AIzaSyA-valid_Google-Maps_Key12\norg.gradle.parallel=true\n');
  });
});
