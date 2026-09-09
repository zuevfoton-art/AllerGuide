/**
 * Hermes / React Native release builds do not implement `crypto.getRandomValues`.
 * `hashPassword` reads CSPRNG at call time (`getSecureRandomBytes`); this patch
 * covers other callers (and the Web Crypto fallback) that still use `globalThis.crypto`.
 */

export type GetRandomValuesFn = (array: Uint8Array) => Uint8Array;

export type CryptoGetRandomValuesHolder = {
  crypto?: {
    getRandomValues?: GetRandomValuesFn;
  };
};

export function ensureCryptoGetRandomValues(
  holder: CryptoGetRandomValuesHolder,
  getRandomValues: GetRandomValuesFn,
): void {
  const existing = holder.crypto;
  if (typeof existing?.getRandomValues === 'function') {
    return;
  }
  let next: { getRandomValues: GetRandomValuesFn };
  try {
    next = existing ? Object.assign(existing, { getRandomValues }) : { getRandomValues };
  } catch {
    next = { getRandomValues };
  }

  try {
    Object.defineProperty(holder, 'crypto', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: next,
    });
  } catch {
    holder.crypto = next;
  }
}
