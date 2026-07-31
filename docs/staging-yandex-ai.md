# Staging — Yandex AI

**Status (staging):** Phase **0–2 done**; options **A / B / C enabled**; Phase **3 STT** implemented (default **off**); Phase **4 Search** cache + prompt tune **in code** (needs API redeploy for cache); option **D multimodal** deferred.

| Layer | Staging state |
|-------|----------------|
| Lockbox / health | `AI_PROVIDER=yandex`, `AI_SCAN_ENABLED`, `YC_OCR`, `YC_SCAN_INTENT_LLM`, `YC_SEARCH` → `true` |
| Model | `YC_GPT_MODEL=yandexgpt-lite` (explicit; A/B via Lockbox only) |
| Mobile EAS `staging` | `EXPO_PUBLIC_AI_SCAN_ENABLED`, `YC_OCR`, `YC_SCAN_INTENT_LLM`, `YC_SEARCH` = `true`; `YC_STT` = off |
| Production EAS | OCR / intent / search / STT **off** until staging QA green |

---

## Phase 0 — credentials

| Ресурс | Значение |
|--------|----------|
| Folder | `b1glkbb9i8ufp6bsdn4u` |
| SA | `aclearo-staging-ai` |
| Terraform | [`infra/yandex/staging/ai.tf`](../infra/yandex/staging/ai.tf) |
| Lockbox | `aclearo-staging-api-env` (`e6qs399v1b3unstfh5rj`) |

### Роли SA на folder

- `ai.languageModels.user`
- `ai.vision.user`
- `ai.speechkit-stt.user`
- `search-api.executor`
- `search-api.webSearch.user`

### Scopes API-ключа

- `yc.ai.languageModels.execute`
- `yc.ai.foundationModels.execute`
- `yc.ai.vision.execute`
- `yc.ai.speechkitStt.execute`
- `yc.search-api.execute`

### Ключи в Lockbox

| Key | Назначение |
|-----|------------|
| `YC_FOLDER_ID` | folder id для `modelUri` / заголовков |
| `YC_AI_SERVICE_ACCOUNT_ID` | id SA |
| `YC_AI_API_KEY` | секрет API-ключа |
| `YC_AI_API_KEY_ID` | id ключа (ротация) |
| `AI_PROVIDER` | `yandex` |
| `AI_SCAN_ENABLED` / `YC_OCR_ENABLED` | Phase 1–2 (**on** staging) |
| `YC_GPT_MODEL` | default `yandexgpt-lite` (explicit) |
| `SCAN_DAILY_BUDGET` | e.g. `100` |
| `YC_SCAN_INTENT_LLM` / `YC_SEARCH_ENABLED` | options B/C (**on** staging) |
| `YC_STT_ENABLED` | Phase 3 SpeechKit (**off** until QA) |

Smoke credentials:

```bash
./scripts/yc-ai-phase0-smoke.sh --from-lockbox
```

Ожидание: четыре `OK` (GPT, OCR, STT, Search) → `Phase 0 smoke PASSED`.

Ротация ключа: см. `yc iam api-key create` с scopes выше → новая версия Lockbox. Секрет не коммитить.

---

## Phase 1 — YandexGPT в `/api/scan`

| Item | Detail |
|------|--------|
| Code | `apps/api/src/services/llm-scan-provider.ts` |
| Route | `POST /api/scan` → `callScanLlm()` |
| Env | `AI_PROVIDER=yandex`, `AI_SCAN_ENABLED=true`, `YC_AI_API_KEY`, `YC_FOLDER_ID`, `YC_GPT_MODEL` |
| Fallback | Mobile `runSmartScan` → mock при 502 / флаге off |
| OpenAI | `AI_PROVIDER=openai` + `OPENAI_*` (default для локальных тестов) |

```bash
curl -sS -X POST "$STAGING_API_URL/api/scan" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"mode":"product","text":"состав: молоко, сахар","allergens":["Молоко"]}'
```

`GET /api/health` → `features.aiScan: true`, `features.aiScanProvider: "yandex"`.

### Model A/B (optional)

Keep **`yandexgpt-lite`** as default. To experiment without new code:

```bash
./scripts/yc-lockbox-upsert.sh YC_GPT_MODEL=yandexgpt   # or aliceai-llm if in folder catalog
# redeploy Serverless revision, then:
./scripts/staging-scan-smoke.sh
./scripts/staging-yandex-ai-smoke.sh
```

Compare invalid-JSON rate, latency, and cost; revert to `yandexgpt-lite` if worse. Do **not** change `AI_PROVIDER`.

---

## Phase 2 — Vision OCR (`POST /api/ocr`)

| Item | Detail |
|------|--------|
| Code | `apps/api/src/services/yandex-vision-ocr.ts`, `routes/ocr.ts` |
| Mobile | `ocr-api-service.ts` + `scanner-service.extractOcrFromImage` |
| Env API | `YC_OCR_ENABLED=true`, `YC_AI_API_KEY`, `YC_FOLDER_ID` |
| Env mobile | `EXPO_PUBLIC_YC_OCR=true` |
| Auth | Same as scan (`SCAN_REQUIRE_AUTH` / `OCR_REQUIRE_AUTH`) |
| Fallback | Demo OCR + manual text when flag off or API fails |

`GET /api/health` → `features.ycOcr: true` when enabled.

---

## Scanner photo routing

После фото в режиме «Сканер»:

### A — default (всегда)

1. **Yandex Vision OCR** (`POST /api/ocr`) или demo OCR offline  
2. **Heuristic** `classifyScanIntentHeuristic` — плотный текст / «Состав» → `label_or_menu`; короткое имя → `visual_product`  
3. **label_or_menu** → `POST /api/scan` (YandexGPT) / mock  
4. **visual_product** → OFF / локальный каталог → затем GPT/mock  

Флаги mobile: `EXPO_PUBLIC_YC_OCR`, `EXPO_PUBLIC_AI_SCAN_ENABLED` (оба могут быть off — тогда demo + mock).

### B — GPT intent classifier (flag) — **on staging**

| Item | Detail |
|------|--------|
| API | `POST /api/scan/intent` · `YC_SCAN_INTENT_LLM=true` + `AI_SCAN_ENABLED=true` |
| Mobile | `EXPO_PUBLIC_YC_SCAN_INTENT_LLM=true` · `scan-intent-api-service.ts` |
| Domain | `buildScanIntentPrompt` / `parseScanIntentResponse` in `@allerguide/ai` |
| Fallback | Heuristic A при флаге off / 5xx / invalid JSON |

`GET /api/health` → `features.ycScanIntentLlm: true`.

Enable/re-enable B+C on YC staging:

```bash
export YC_CONTAINER_ID=bba700s2t35i2khgmiit
export YC_REGISTRY_ID=crpf0kl3mrg2qnnd374l
BUILD_PUSH=1 ./scripts/yc-stage-enable-scan-intent-search.sh
```

### C — Yandex Search ingredients (flag) — **on staging**

| Item | Detail |
|------|--------|
| API | `POST /api/search/ingredients` · `YC_SEARCH_ENABLED=true` + `YC_AI_*` |
| Mobile | `EXPO_PUBLIC_YC_SEARCH=true` · after OFF/catalog miss in `lookupDishIngredientsForScan` |
| Provider | Generative search → web search snippets |
| Cache | In-memory (+ Redis if configured); `SEARCH_CACHE_TTL_MS` / `SEARCH_DAILY_BUDGET` (fallback to scan limits) |
| Fallback | Skip (continue OCR text analysis) when off / 404 |

`GET /api/health` → `features.ycSearch: true`.

### D — multimodal (deferred)

Прямой разбор фото без отдельного OCR — **не реализован**. Не начинать до стабильного клиентского QA A–C и SpeechKit. Offline-first не ломать.

---

## Phase 3 — SpeechKit STT (`POST /api/stt`)

| Item | Detail |
|------|--------|
| Code | `apps/api/src/services/yandex-speechkit-stt.ts`, `routes/stt.ts` |
| Mobile | `stt-api-service.ts` → `recognizeSpeechViaApi` (OS speech remains default via `expo-speech-recognition`) |
| Env API | `YC_STT_ENABLED=true` + `YC_AI_*` |
| Env mobile | `EXPO_PUBLIC_YC_STT=true` |
| Auth | Inherits `SCAN_REQUIRE_AUTH` unless `STT_REQUIRE_AUTH` set |
| Fallback | Flag off / 5xx → keep local voice or manual text |

Staging default: **off** (`features.ycStt` absent). Enable after Search QA:

```bash
./scripts/yc-lockbox-upsert.sh YC_STT_ENABLED=true
# redeploy, then set EXPO_PUBLIC_YC_STT=true on next EAS staging build
```

Не путать с **навыком Алисы (Диалоги)** — отдельный продукт.

---

## Phase 4 — Search tune / cache

Done in code:

- Stronger composition query + passage scoring in `@allerguide/ai` `search-ingredients.ts`
- Cache + daily budget in `apps/api/src/lib/search-ingredients-cache.ts`
- Route returns `cached: true|false`

Redeploy API to pick up cache behavior on staging.

---

## Smokes

```bash
./scripts/yc-ai-phase0-smoke.sh --from-lockbox   # credentials
./scripts/staging-scan-smoke.sh                  # JWT + scan cache
./scripts/staging-yandex-ai-smoke.sh             # intent + search + ocr + scan
./scripts/staging-preflight.sh                   # includes yandex-ai smoke
```

Manual APK (EAS `staging`): see [`qa-checklist.md`](./qa-checklist.md) § «Yandex AI scanner staging».

---

## Next

1. **Client QA** on EAS staging APK (label OCR → intent → scan; dish → search; airplane mock)
2. Redeploy API if search-cache revision not live yet
3. Optional `YC_GPT_MODEL` A/B after metrics
4. Enable Phase 3 STT on staging when voice fallback is needed
5. Option D multimodal — later

Offline-first и feature flags: без флагов приложение работает как раньше (A heuristic + demo OCR + mock).
