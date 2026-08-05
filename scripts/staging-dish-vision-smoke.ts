/**
 * Staging smoke for Option D dish vision (Yandex VL).
 * JWT → food JPEG → expect 200 + result.dishName.
 *
 * Run: pnpm exec tsx scripts/staging-dish-vision-smoke.ts
 *      ./scripts/staging-dish-vision-smoke.sh
 *
 * Health aiDishVision=true only means flags/creds are mounted — this script is the readiness check.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE = (process.env.STAGING_API_URL ?? 'https://api.staging.aclearo.com').replace(/\/$/, '');
const RAND = process.env.RAND ?? String(Date.now());
const EMAIL = `staging-dish-vl-${RAND}@example.com`;
const PASSWORD = 'SmokeTest1!';

/** Real food JPEG fixture (abstract shapes are correctly rejected as non-food). */
function loadSmokeImage(): { base64: string; mimeType: string } {
  const candidates = [
    process.env.DISH_VISION_SMOKE_IMAGE_PATH,
    join(process.cwd(), 'scripts/fixtures/dish-vision-smoke.jpg'),
    join(process.cwd(), 'fixtures/dish-vision-smoke.jpg'),
  ].filter((p): p is string => Boolean(p));

  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const lower = path.toLowerCase();
    const mimeType = lower.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return { base64: readFileSync(path).toString('base64'), mimeType };
  }
  throw new Error(
    'Missing smoke fixture scripts/fixtures/dish-vision-smoke.jpg (or set DISH_VISION_SMOKE_IMAGE_PATH)',
  );
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

  const image = loadSmokeImage();
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
      body: JSON.stringify({ imageBase64: image.base64, mimeType: image.mimeType }),
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
