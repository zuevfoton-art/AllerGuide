import { describe, expect, it } from 'vitest';
import { ensureCryptoGetRandomValues } from './polyfill-crypto-get-random-values';

function fillSequential(array: Uint8Array): Uint8Array {
  for (let index = 0; index < array.length; index += 1) {
    array[index] = index + 1;
  }
  return array;
}

describe('ensureCryptoGetRandomValues', () => {
  it('installs getRandomValues when crypto is missing', () => {
    const holder: { crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array } } = {};
    ensureCryptoGetRandomValues(holder, fillSequential);
    const bytes = new Uint8Array(4);
    holder.crypto?.getRandomValues?.(bytes);
    expect(Array.from(bytes)).toEqual([1, 2, 3, 4]);
  });

  it('does not replace an existing getRandomValues implementation', () => {
    const original = (array: Uint8Array) => {
      array.fill(9);
      return array;
    };
    const holder = { crypto: { getRandomValues: original } };
    ensureCryptoGetRandomValues(holder, fillSequential);
    expect(holder.crypto.getRandomValues).toBe(original);
  });

  it('adds getRandomValues onto an existing crypto object', () => {
    const holder: { crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array } } = {
      crypto: {},
    };
    ensureCryptoGetRandomValues(holder, fillSequential);
    const bytes = new Uint8Array(2);
    holder.crypto?.getRandomValues?.(bytes);
    expect(Array.from(bytes)).toEqual([1, 2]);
  });
});
