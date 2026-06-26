import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha2';
import { randomBytes } from '@noble/hashes/utils';

const PREFIX = 'pbkdf2-sha256';
const ITERATIONS = 600_000;
const LEGACY_SALT = 'allerguide:';
const textEncoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triplet = (a << 16) | (b << 8) | c;
    output += alphabet[(triplet >> 18) & 63];
    output += alphabet[(triplet >> 12) & 63];
    output += i + 1 < bytes.length ? alphabet[(triplet >> 6) & 63] : '=';
    output += i + 2 < bytes.length ? alphabet[triplet & 63] : '=';
  }
  return output;
}

function fromBase64(value: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const sanitized = value.replace(/[^A-Za-z0-9+/=]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < sanitized.length; i += 4) {
    const a = alphabet.indexOf(sanitized[i]);
    const b = alphabet.indexOf(sanitized[i + 1]);
    const c = sanitized[i + 2] === '=' ? 0 : alphabet.indexOf(sanitized[i + 2]);
    const d = sanitized[i + 3] === '=' ? 0 : alphabet.indexOf(sanitized[i + 3]);
    const triplet = (a << 18) | (b << 12) | (c << 6) | d;
    bytes.push((triplet >> 16) & 255);
    if (sanitized[i + 2] !== '=') bytes.push((triplet >> 8) & 255);
    if (sanitized[i + 3] !== '=') bytes.push(triplet & 255);
  }
  return Uint8Array.from(bytes);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const result = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    result[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return result;
}

/**
 * PBKDF2-SHA256 and SHA-256 are implemented with the pure-JS `@noble/hashes`
 * library (no native module). This keeps the byte output identical to the
 * previous Web Crypto implementation (so existing hashes still verify) while
 * removing the dependency on `react-native-quick-crypto`, whose native init
 * crashed the Android app at launch.
 */
function sha256Hex(input: string): string {
  return bytesToHex(sha256(textEncoder.encode(input)));
}

function derivePbkdf2(password: string, salt: Uint8Array, iterations: number): Uint8Array {
  return pbkdf2(sha256, textEncoder.encode(password), salt, { c: iterations, dkLen: 32 });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = derivePbkdf2(password, salt, ITERATIONS);
  return `${PREFIX}:${ITERATIONS}:${toBase64(salt)}:${toBase64(hash)}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<{ valid: boolean; upgradedHash?: string }> {
  if (stored.startsWith(`${PREFIX}:`)) {
    const [, iterationsRaw, saltB64, hashB64] = stored.split(':');
    const iterations = Number(iterationsRaw);
    if (!iterations || !saltB64 || !hashB64) return { valid: false };

    const salt = fromBase64(saltB64);
    const expected = fromBase64(hashB64);
    const actual = derivePbkdf2(password, salt, iterations);

    if (actual.length !== expected.length) return { valid: false };
    let diff = 0;
    for (let i = 0; i < actual.length; i += 1) diff |= actual[i] ^ expected[i];
    if (diff !== 0) return { valid: false };
    if (iterations !== ITERATIONS) {
      const upgradedHash = await hashPassword(password);
      return { valid: true, upgradedHash };
    }
    return { valid: true };
  }

  const legacy = sha256Hex(`${LEGACY_SALT}${password}`);
  const storedBytes = hexToBytes(stored);
  const legacyBytes = hexToBytes(legacy);
  if (storedBytes.length !== legacyBytes.length) return { valid: false };
  let diff = 0;
  for (let i = 0; i < storedBytes.length; i += 1) diff |= storedBytes[i] ^ legacyBytes[i];
  if (diff !== 0) return { valid: false };

  const upgradedHash = await hashPassword(password);
  return { valid: true, upgradedHash };
}
