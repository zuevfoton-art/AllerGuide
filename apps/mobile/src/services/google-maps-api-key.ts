/** Google Maps Platform browser/Android/iOS keys start with `AIza`. */
const GOOGLE_MAPS_API_KEY_PATTERN = /^AIza[0-9A-Za-z_-]{20,}$/;

/**
 * True only for a real Maps Platform key. Rejects empty values and baked-in
 * CLI/auth error prose (those produce a gray native MapView).
 */
export function isGoogleMapsApiKey(value: string | null | undefined): boolean {
  return typeof value === 'string' && GOOGLE_MAPS_API_KEY_PATTERN.test(value.trim());
}

export function readGoogleMapsApiKey(
  value: string | null | undefined = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
): string {
  const trimmed = value?.trim() ?? '';
  return isGoogleMapsApiKey(trimmed) ? trimmed : '';
}
