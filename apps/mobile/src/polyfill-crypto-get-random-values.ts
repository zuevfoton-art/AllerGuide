/**
 * Hermes / React Native release builds do not implement `crypto.getRandomValues`.
 * `@noble/hashes` `randomBytes()` (used by `hashPassword`) throws without it:
 * "crypto.getRandomValues must be defined".
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
  if (existing) {
    existing.getRandomValues = getRandomValues;
    return;
  }
  holder.crypto = { getRandomValues };
}
