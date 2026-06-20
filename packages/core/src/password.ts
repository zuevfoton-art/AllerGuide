import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils';

const PREFIX = 'pbkdf2-sha256';
const ITERATIONS = 600_000;
const LEGACY_SALT = 'allerguide:';

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

function derivePbkdf2(password: string, salt: Uint8Array): Uint8Array {
  return pbkdf2(sha256, new TextEncoder().encode(password), salt, {
    c: ITERATIONS,
    dkLen: 32,
  });
}

function hashLegacy(password: string): string {
  return bytesToHex(sha256(new TextEncoder().encode(`${LEGACY_SALT}${password}`)));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = derivePbkdf2(password, salt);
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
    const actual =
      iterations === ITERATIONS
        ? derivePbkdf2(password, salt)
        : pbkdf2(sha256, new TextEncoder().encode(password), salt, {
            c: iterations,
            dkLen: 32,
          });

    if (actual.length !== expected.length) return { valid: false };
    let diff = 0;
    for (let i = 0; i < actual.length; i += 1) diff |= actual[i] ^ expected[i];
    return { valid: diff === 0 };
  }

  const legacy = hashLegacy(password);
  const storedBytes = hexToBytes(stored);
  const legacyBytes = hexToBytes(legacy);
  if (storedBytes.length !== legacyBytes.length) return { valid: false };
  let diff = 0;
  for (let i = 0; i < storedBytes.length; i += 1) diff |= storedBytes[i] ^ legacyBytes[i];
  if (diff !== 0) return { valid: false };

  const upgradedHash = await hashPassword(password);
  return { valid: true, upgradedHash };
}
