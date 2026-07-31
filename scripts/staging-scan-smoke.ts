/**
 * Staging API smoke: JWT auth + AI scan cache hit (P1.5b).
 * Requires staging API with AI_SCAN_ENABLED=true and AI_PROVIDER=yandex (or OPENAI_*).
 * Run: pnpm --filter api exec tsx ../../scripts/staging-scan-smoke.ts
 * Broader Yandex AI checks: scripts/staging-yandex-ai-smoke.ts
 */
const BASE = (process.env.STAGING_API_URL ?? 'https://api.staging.aclearo.com').replace(/\/$/, '');
const RAND = process.env.RAND ?? String(Date.now());
const EMAIL = `staging-scan-${RAND}@example.com`;
const PASSWORD = 'SmokeTest1!';
const SCAN_TEXT = `staging smoke ${RAND} молоко сахар`;

async function api<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const response = await fetch(`${BASE}${path}`, init);
  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text
  }
  if (!response.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${path} → ${response.status}: ${text}`);
  }
  return { status: response.status, body: body as T };
}

async function main() {
  console.log(`Staging scan smoke: ${BASE}`);
  console.log(`Test user: ${EMAIL}`);

  const health = await api<{
    ok: boolean;
    features?: { aiScan: boolean };
    scan?: { enabled: boolean; dailyBudget: number };
  }>('/api/health');
  console.log('Health:', health.body);
  if (!health.body.ok) throw new Error('Health check failed');
  if (!health.body.features?.aiScan) {
    throw new Error('AI_SCAN_ENABLED is not true on staging API (P1.5a)');
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

  const scanPayload = {
    mode: 'product' as const,
    text: SCAN_TEXT,
    allergens: ['Молоко'],
  };

  const first = await api<{ ok: boolean; cached: boolean; result?: { verdict: string } }>(
    '/api/scan',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(scanPayload),
    },
  );

  if (!first.body.ok || !first.body.result?.verdict) {
    throw new Error('First scan failed — check YC_AI_* / OPENAI_API_KEY on staging (P1.5a)');
  }
  if (first.body.cached) {
    throw new Error('Expected cache miss on first scan');
  }

  const second = await api<{ ok: boolean; cached: boolean }>('/api/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(scanPayload),
  });

  if (!second.body.ok || !second.body.cached) {
    throw new Error('Second scan should be served from cache');
  }

  console.log('Scan smoke passed (JWT auth, LLM miss + cache hit).');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
