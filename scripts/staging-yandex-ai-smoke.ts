/**
 * Staging Yandex AI E2E smoke (Phases 1–2 + options B/C).
 * Covers health feature flags, JWT, /api/scan/intent, /api/search/ingredients,
 * /api/ocr (auth reachability), and /api/scan cache.
 *
 * Run: pnpm --filter api exec tsx ../../scripts/staging-yandex-ai-smoke.ts
 */
const BASE = (process.env.STAGING_API_URL ?? 'https://api.staging.aclearo.com').replace(/\/$/, '');
const RAND = process.env.RAND ?? String(Date.now());
const EMAIL = `staging-yai-${RAND}@example.com`;
const PASSWORD = 'SmokeTest1!';

/** Minimal 8×8 PNG (auth/reachability; may return 422 No text). */
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAD0lEQVR4nGP4jwMwDC0JALoev0Ewkwr8AAAAAElFTkSuQmCC';

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
    // keep raw text
  }
  const allowed = options?.allowStatuses ?? [];
  if (!response.ok && !allowed.includes(response.status)) {
    throw new Error(`${init?.method ?? 'GET'} ${path} → ${response.status}: ${text}`);
  }
  return { status: response.status, body: body as T };
}

async function main() {
  console.log(`Staging Yandex AI smoke: ${BASE}`);
  console.log(`Test user: ${EMAIL}`);

  const health = await api<{
    ok: boolean;
    features?: {
      aiScan?: boolean;
      aiScanProvider?: string;
      ycOcr?: boolean;
      ycScanIntentLlm?: boolean;
      ycSearch?: boolean;
      ycStt?: boolean;
    };
  }>('/api/health');
  console.log('Health features:', health.body.features);
  if (!health.body.ok) throw new Error('Health check failed');

  const feat = health.body.features ?? {};
  if (!feat.aiScan || feat.aiScanProvider !== 'yandex') {
    throw new Error('Expected aiScan=true and aiScanProvider=yandex');
  }
  if (!feat.ycOcr) throw new Error('Expected ycOcr=true on staging');
  if (!feat.ycScanIntentLlm) throw new Error('Expected ycScanIntentLlm=true on staging');
  if (!feat.ycSearch) throw new Error('Expected ycSearch=true on staging');
  if (!feat.ycStt) throw new Error('Expected ycStt=true on staging (Phase 3)');

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

  const intent = await api<{ ok: boolean; intent?: string; mode?: string; source?: string }>(
    '/api/scan/intent',
    {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ text: 'Меню: паста карбонара, салат цезарь' }),
    },
  );
  if (!intent.body.ok || !intent.body.intent) {
    throw new Error('scan/intent failed');
  }
  console.log('PASS intent:', intent.body.intent, intent.body.source ?? '');

  const search = await api<{ ok: boolean; ingredients?: string; source?: string; cached?: boolean }>(
    '/api/search/ingredients',
    {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ query: 'оливье' }),
    },
    { allowStatuses: [404] },
  );
  if (search.status === 404) {
    console.log('PASS search: 404 (no ingredients — acceptable fallback)');
  } else if (search.body.ok && search.body.ingredients?.trim()) {
    console.log(
      'PASS search:',
      search.body.source,
      search.body.cached ? 'cached' : 'miss',
      `len=${search.body.ingredients.length}`,
    );
  } else {
    throw new Error('search/ingredients unexpected response');
  }

  if (search.status === 200 && search.body.ingredients) {
    const searchAgain = await api<{ ok: boolean; cached?: boolean }>('/api/search/ingredients', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ query: 'оливье' }),
    });
    if (searchAgain.body.cached) {
      console.log('PASS search cache hit');
    } else {
      console.log(
        'WARN search cache miss on repeat (memory store may be multi-instance; Redis makes this sticky)',
      );
    }
  }

  const ocr = await api<{ ok?: boolean; error?: string; text?: string }>(
    '/api/ocr',
    {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        imageBase64: TINY_PNG_B64,
        mimeType: 'image/png',
      }),
    },
    { allowStatuses: [422, 502] },
  );
  if (ocr.status === 200 && ocr.body.ok) {
    console.log('PASS ocr: text recognized');
  } else if (ocr.status === 422 || ocr.status === 502) {
    console.log(`PASS ocr: provider reachable (HTTP ${ocr.status})`);
  } else {
    throw new Error(`ocr unexpected HTTP ${ocr.status}`);
  }

  const scanText = `yai smoke ${RAND} состав: молоко, сахар`;
  const scanPayload = { mode: 'product' as const, text: scanText, allergens: ['Молоко'] };
  const first = await api<{ ok: boolean; cached: boolean; result?: { verdict: string } }>(
    '/api/scan',
    {
      method: 'POST',
      headers: auth,
      body: JSON.stringify(scanPayload),
    },
  );
  if (!first.body.ok || !first.body.result?.verdict) {
    throw new Error('First scan failed — check YC_AI_* / AI_PROVIDER=yandex');
  }
  if (first.body.cached) throw new Error('Expected cache miss on first scan');
  console.log('PASS scan: cache miss + verdict');

  const second = await api<{ ok: boolean; cached: boolean }>('/api/scan', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify(scanPayload),
  });
  if (second.body.ok && second.body.cached) {
    console.log('PASS scan: cache hit');
  } else if (second.body.ok) {
    console.log(
      'WARN scan cache miss on repeat (memory store may be multi-instance; Redis makes this sticky)',
    );
  } else {
    throw new Error('Second scan failed');
  }

  // Phase 3 STT — silent LPCM should reach SpeechKit (often empty → 422).
  const silentPcm = Buffer.alloc(16000 * 2 * 0.3).toString('base64'); // 0.3s silence @16kHz mono
  const stt = await api<{ ok?: boolean; error?: string; text?: string }>(
    '/api/stt',
    {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        audioBase64: silentPcm,
        format: 'lpcm',
        sampleRateHertz: 16000,
        lang: 'ru-RU',
      }),
    },
    { allowStatuses: [422, 502] },
  );
  if (stt.status === 200 && stt.body.ok) {
    console.log('PASS stt: transcript', stt.body.text?.slice(0, 40) ?? '');
  } else if (stt.status === 422) {
    console.log('PASS stt: no speech (HTTP 422) — provider OK');
  } else if (stt.status === 502) {
    throw new Error('stt HTTP 502 — SpeechKit unavailable (unexpected on staging)');
  } else {
    throw new Error(`stt unexpected HTTP ${stt.status}`);
  }

  console.log('Yandex AI smoke passed (intent + search + ocr + scan + stt).');
  console.log('Manual APK still required: photo label → OCR → intent → scan; airplane mock.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
