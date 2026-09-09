import { Linking } from 'react-native';
import { logCaughtError } from '@/src/services/error-reporting';

/**
 * Opening a URL that came off the network.
 *
 * Affiliate links, POI booking pages and the Yandex pollen link are all
 * resolved by the backend or a third-party API, so the value reaching
 * `Linking.openURL` is not ours. On native that call hands the string to the
 * OS intent/scheme resolver, which will happily act on `intent:`, `market:` or
 * a custom app scheme; on web `javascript:` runs in our own origin. Only
 * ordinary web pages are ever intended here.
 *
 * `http` is accepted because some partner catalogues still publish plaintext
 * links and the platform upgrades or warns on those itself.
 */
const ALLOWED_SCHEMES = ['https:', 'http:'];

export function isAllowedExternalUrl(url: string): boolean {
  try {
    return ALLOWED_SCHEMES.includes(new URL(url.trim()).protocol);
  } catch {
    return false;
  }
}

/** Opens a network-derived URL, refusing anything that is not an http(s) page. */
export async function openExternalUrl(url: string): Promise<boolean> {
  if (!isAllowedExternalUrl(url)) {
    logCaughtError('external-link', new Error('Blocked external URL with disallowed scheme'));
    return false;
  }

  try {
    await Linking.openURL(url.trim());
    return true;
  } catch (error) {
    logCaughtError('external-link', error);
    return false;
  }
}
