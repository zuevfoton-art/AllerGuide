import { getRandomValues } from 'expo-crypto';
import { setSecureRandomBytes } from '@allerguide/core';
import {
  ensureCryptoGetRandomValues,
  type CryptoGetRandomValuesHolder,
} from './polyfill-crypto-get-random-values';

/**
 * Must run before the first `hashPassword` call. `@noble/hashes` snapshots
 * `globalThis.crypto` at import, so injecting into core is the reliable path
 * on Hermes release builds.
 */
const fill = (array: Uint8Array) => getRandomValues(array);

ensureCryptoGetRandomValues(globalThis as CryptoGetRandomValuesHolder, fill);
if (typeof global !== 'undefined') {
  ensureCryptoGetRandomValues(global as CryptoGetRandomValuesHolder, fill);
}

setSecureRandomBytes((length) => fill(new Uint8Array(length)));
