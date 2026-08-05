/**
 * Staging smoke for Option D dish vision (Yandex VL).
 * JWT → small PNG with image_url → expect 200 + result.dishName.
 *
 * Run: pnpm exec tsx scripts/staging-dish-vision-smoke.ts
 *      ./scripts/staging-dish-vision-smoke.sh
 *
 * Health aiDishVision=true only means flags/creds are mounted — this script is the readiness check.
 */
import { deflateSync } from 'node:zlib';
import { readFileSync, existsSync } from 'node:fs';

const BASE = (process.env.STAGING_API_URL ?? 'https://api.staging.aclearo.com').replace(/\/$/, '');
const RAND = process.env.RAND ?? String(Date.now());
const EMAIL = `staging-dish-vl-${RAND}@example.com`;
const PASSWORD = 'SmokeTest1!';

/** PNG CRC32 (ITU-T V.42). */
function pngCrc32(data: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    c ^= data[i]!;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(pngCrc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/** Synthetic 64×64 “plate” PNG so VL has something to look at. */
function buildSmokePngBase64(): string {
  const fromFile = process.env.DISH_VISION_SMOKE_PNG_PATH;
  if (fromFile && existsSync(fromFile)) {
    return readFileSync(fromFile).toString('base64');
  }

  const size = 64;
  const rows: Buffer[] = [];
  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0;
    for (let x = 0; x < size; x += 1) {
      const dx = x - 32;
      const dy = y - 32;
      const r2 = dx * dx + dy * dy;
      let r = 40;
      let g = 120;
      let b = 40;
      if (r2 < 100) {
        r = 200;
        g = 40;
        b = 40;
      } else if (r2 < 700) {
        r = 230;
        g = 200;
        b = 80;
      }
      const o = 1 + x * 3;
      row[o] = r;
      row[o + 1] = g;
      row[o + 2] = b;
    }
    rows.push(row);
  }
  const raw = Buffer.concat(rows);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return png.toString('base64');
}

async function api<T>(
  path: string,
  init?: RequestInit,
  options?: { allowStatuses?: number[] },
): Promise<{ status: number; body: T }> {
  const response = await fetch(`${BASE}${path}`, init);
  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // keep raw
  }
  const allowed = options?.allowStatuses ?? [];
  if (!response.ok && !allowed.includes(response.status)) {
    throw new Error(`${init?.method ?? 'GET'} ${path} → ${response.status}: ${text.slice(0, 500)}`);
  }
  return { status: response.status, body: body as T };
}

async function main() {
  console.log(`Staging dish-vision smoke: ${BASE}`);

  const health = await api<{
    ok: boolean;
    features?: { aiDishVision?: boolean; aiScanProvider?: string };
  }>('/api/health');
  console.log('Health features:', health.body.features);
  if (!health.body.ok) throw new Error('Health check failed');
  if (!health.body.features?.aiDishVision) {
    throw new Error('Expected features.aiDishVision=true (flags/creds mounted)');
  }

  const register = await api<{ token: string }>('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loginType: 'email',
      login: EMAIL,
      password: PASSWORD,
      confirmPassword: PASSWORD,
    }),
  });
  const token = register.body.token;
  if (!token) throw new Error('Register failed: no token');
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const imageBase64 = buildSmokePngBase64();
  const vision = await api<{
    ok?: boolean;
    result?: { dishName?: string; ingredients?: string[] };
    error?: string;
    providerStatus?: number;
    cached?: boolean;
  }>(
    '/api/scan/dish-vision',
    {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ imageBase64, mimeType: 'image/png' }),
    },
    { allowStatuses: [502, 503] },
  );

  if (vision.status !== 200 || !vision.body.ok) {
    const detail = [
      `HTTP ${vision.status}`,
      vision.body.error,
      vision.body.providerStatus != null ? `providerStatus=${vision.body.providerStatus}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    throw new Error(
      `dish-vision FAILED (red): ${detail}. Check Lockbox YC_VISION_MODEL (qwen3.6-35b-a3b/latest) and AI Studio access.`,
    );
  }

  const dishName = vision.body.result?.dishName?.trim();
  const ingredients = vision.body.result?.ingredients ?? [];
  if (!dishName && ingredients.length === 0) {
    throw new Error('dish-vision 200 but empty result (no dishName/ingredients)');
  }

  console.log(
    'PASS dish-vision:',
    dishName || '(unnamed)',
    `ingredients=${ingredients.length}`,
    vision.body.cached ? 'cached' : 'miss',
  );
  console.log('Dish vision smoke passed.');
  console.log('Note: EAS staging APK rebuild required for mobile dishVisionFailed UI.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
