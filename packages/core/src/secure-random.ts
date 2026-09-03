/**
 * CSPRNG for password salts. `@noble/hashes` `randomBytes()` snapshots
 * `globalThis.crypto` at import time; Hermes often has that property as
 * undefined, so later polyfills never reach noble. Resolve at call time, and
 * allow the mobile app to inject expo-crypto before the first hash.
 */

export type SecureRandomBytesFn = (length: number) => Uint8Array;

let secureRandomBytesImpl: SecureRandomBytesFn | null = null;

export function setSecureRandomBytes(impl: SecureRandomBytesFn | null): void {
  secureRandomBytesImpl = impl;
}

export function getSecureRandomBytes(length: number): Uint8Array {
  if (secureRandomBytesImpl) {
    return secureRandomBytesImpl(length);
  }

  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.getRandomValues === 'function') {
    return webCrypto.getRandomValues(new Uint8Array(length));
  }

  throw new Error('crypto.getRandomValues must be defined');
}
