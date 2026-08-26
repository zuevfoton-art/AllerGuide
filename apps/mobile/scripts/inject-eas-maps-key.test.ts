import { describe, expect, it } from 'vitest';
import {
  isGoogleMapsApiKey,
  parseDotEnvMapsKey,
  resolveMapsApiKey,
  resolveMapsApiKeyFromSources,
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

  it('reads the Maps key from dotenv text used by EAS Environments', () => {
    expect(
      parseDotEnvMapsKey(
        'EXPO_PUBLIC_API_URL=https://api.staging.aclearo.com\nEXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyA-valid_Google-Maps_Key12\n',
      ),
    ).toBe('AIzaSyA-valid_Google-Maps_Key12');
    expect(
      parseDotEnvMapsKey('export EXPO_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaSyA-valid_Google-Maps_Key12"'),
    ).toBe('AIzaSyA-valid_Google-Maps_Key12');
    expect(
      resolveMapsApiKeyFromSources({
        envValue: '',
        dotEnvContents: ['EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyA-valid_Google-Maps_Key12\n'],
      }),
    ).toEqual({ ok: true, key: 'AIzaSyA-valid_Google-Maps_Key12' });
    expect(
      resolveMapsApiKeyFromSources({
        envValue: 'The bearer token is invalid.',
        dotEnvContents: ['EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyA-valid_Google-Maps_Key12\n'],
      }),
    ).toEqual({ ok: false, key: '' });
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
