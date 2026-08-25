import { describe, expect, it } from 'vitest';
import { isGoogleMapsApiKey, readGoogleMapsApiKey } from './google-maps-api-key';

describe('google-maps-api-key', () => {
  it('accepts a typical Maps Platform key', () => {
    expect(isGoogleMapsApiKey('AIzaSyA-valid_Google-Maps_Key12')).toBe(true);
    expect(readGoogleMapsApiKey('  AIzaSyA-valid_Google-Maps_Key12  ')).toBe(
      'AIzaSyA-valid_Google-Maps_Key12',
    );
  });

  it('rejects missing values and baked-in CLI errors', () => {
    expect(isGoogleMapsApiKey(undefined)).toBe(false);
    expect(isGoogleMapsApiKey('')).toBe(false);
    expect(isGoogleMapsApiKey('The bearer token is invalid.')).toBe(false);
    expect(readGoogleMapsApiKey('The bearer token is invalid.')).toBe('');
  });
});
