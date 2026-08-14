# Staging — Yandex AI

**Status (staging):** Phase **0–2 done**; options **A / B / C enabled**; Phase **3 STT on**; Phase **4 Search** cache + prompt tune **on**; option **D multimodal** deferred.

| Layer | Staging state |
|-------|----------------|
| Lockbox / health | `AI_PROVIDER=yandex`, `AI_SCAN_ENABLED`, `YC_OCR`, `YC_SCAN_INTENT_LLM`, `YC_SEARCH`, `YC_STT` → `true` |
| Model | `YC_GPT_MODEL=yandexgpt-lite` (explicit; A/B via Lockbox only) |
| Mobile EAS `staging` | `EXPO_PUBLIC_AI_SCAN_ENABLED`, `YC_OCR`, `YC_SCAN_INTENT_LLM`, `YC_SEARCH`, `YC_STT`, `YC_STT_MIC` = `true` |
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
| Mobile | `ocr-api-service.ts` + `scanner-ocr-service.extractOcrFromImage` (реэкспорт `scanner-service`) |
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

### D — multimodal dish vision (`POST /api/scan/dish-vision`)

Прямой разбор **фото блюда без текста** (как в калорийных приложениях): модель возвращает `dishName` + `ingredients[]`, затем mobile сверяет состав с профилем через `runSmartScan`.

| Слой | Файл | Поведение |
|------|------|-----------|
| Domain | [`packages/ai/src/dish-vision.ts`](../packages/ai/src/dish-vision.ts) | prompt / parse / `dishVisionToScanText` |
| Provider | [`apps/api/src/services/llm-dish-vision-provider.ts`](../apps/api/src/services/llm-dish-vision-provider.ts) | Yandex AI Studio OpenAI-compatible chat + `image_url` (`https://ai.api.cloud.yandex.net/v1/chat/completions`) |
| Route | [`apps/api/src/routes/scan-dish-vision.ts`](../apps/api/src/routes/scan-dish-vision.ts) | cache + shared scan daily budget; при fail — `502` + `providerStatus` |
| Mobile | [`scanner-ocr-service.ts`](../apps/mobile/src/services/scanner-ocr-service.ts) + [`scanner-dish-vision-service.ts`](../apps/mobile/src/services/scanner-dish-vision-service.ts) (баррель [`scanner-service.ts`](../apps/mobile/src/services/scanner-service.ts)) + `dish-vision-api-service.ts` | product photo: VL first → OCR if readable text; fail → `scanner.dishVisionFailed` (не пустой clear) |
| Flags | API `AI_DISH_VISION_ENABLED` (+ `AI_SCAN_ENABLED`); mobile `EXPO_PUBLIC_AI_DISH_VISION` | **on** staging; off by default offline-safe elsewhere |
| Yandex model | `YC_VISION_MODEL` | **только multimodal** из каталога folder; text-only `yandexgpt-lite` **не** подходит |
| UX | усиленный disclaimer / trust line (`dishVisionDisclaimer`) | source `dish_vision` |

#### Модели staging folder (`b1glkbb9i8ufp6bsdn4u`)

| Роль | Model id (Lockbox / env) | Замечание |
|------|--------------------------|-----------|
| **Primary** | `qwen3.6-35b-a3b/latest` | Подтверждён image smoke (`image_url` → HTTP 200 + JSON). Каталог AI Studio на 2026-08; отдельного `qwen2.5-vl-*` в folder **нет**. |
| Alternate | `gpt-oss-20b/latest` / др. multimodal из `/v1/models` | Только после отдельного image smoke; не считать vision без проверки. |
| Deprecated | `gemma-3-27b-it` | Нет в доступном каталоге → **403 Forbidden** — не использовать. |
| Не использовать | Llama 3.3 / `qwen2.5-vl-*` | В этом folder id отсутствуют (`Failed to get model`). |

OpenAI vision **не** подключаем как stage fallback. Endpoint override: `YC_VISION_BASE_URL` (default `https://ai.api.cloud.yandex.net/v1/chat/completions`).

`GET /api/health` → `features.aiDishVision: true` только значит, что флаги/креды смонтированы. Критерий готовности — smoke:

```bash
pnpm exec tsx scripts/staging-dish-vision-smoke.ts
# или
./scripts/staging-dish-vision-smoke.sh
```

Ожидание: JWT → PNG/JPEG → `POST /api/scan/dish-vision` → **200** + `result.dishName` / `ingredients`. Тело с `providerStatus: 403` — явный красный.

**Stage enable / rotate model:**

```bash
# preferred helper (flags + redeploy)
./scripts/yc-stage-enable-dish-vision.sh
# or Lockbox only:
./scripts/yc-lockbox-upsert.sh \
  "AI_DISH_VISION_ENABLED=true" \
  "AI_SCAN_ENABLED=true" \
  "YC_VISION_MODEL=qwen3.6-35b-a3b/latest"
# затем redeploy API revision (Lockbox payload → container env)
```

Mobile Gradle/EAS staging set `EXPO_PUBLIC_AI_DISH_VISION=true`. После UI-фиксов (`dishVisionFailed`) нужен staging APK rebuild.


---

## Phase 3 — SpeechKit STT (`POST /api/stt`) — **on staging**

Голосовой fallback для текста (сканер / дневник), когда OS speech recognition недоступен или нужен облачный STT.

### Что сделано

| Слой | Файл | Поведение |
|------|------|-----------|
| API service | [`apps/api/src/services/yandex-speechkit-stt.ts`](../apps/api/src/services/yandex-speechkit-stt.ts) | `POST https://stt.api.cloud.yandex.net/speech/v1/stt:recognize` (`Api-Key`, `folderId`) |
| Route | [`apps/api/src/routes/stt.ts`](../apps/api/src/routes/stt.ts) | `POST /api/stt` body: `{ audioBase64, lang?, format?: 'lpcm'\|'oggopus', sampleRateHertz? }` |
| Health | `features.ycStt: true` когда `YC_STT_ENABLED=true` + `YC_AI_*` | |
| Mobile | [`stt-api-service.ts`](../apps/mobile/src/services/stt-api-service.ts) | `recognizeSpeechViaApi` → `/api/stt`; `null` если флаг off |
| Flag mobile | `EXPO_PUBLIC_YC_STT` | EAS `staging` = `true` |
| Auth | как scan (`SCAN_REQUIRE_AUTH`, override `STT_REQUIRE_AUTH`) | |
| Fallback | флаг off / 5xx → OS `expo-speech-recognition` или ручной ввод | |

Не путать с **навыком Алисы (Диалоги)** — это in-app API, не колонка.

### Как тестировать на stage

**API (curl):**

```bash
# register / login → TOKEN
# 0.3s silence LPCM (reachability; often HTTP 422 No speech)
python3 - <<'PY'
import wave, base64
with wave.open("/tmp/stt-silent.wav","w") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000)
    w.writeframes(b"\x00\x00"*4800)
print(base64.b64encode(open("/tmp/stt-silent.wav","rb").read()).decode())
PY
# put B64 into:
curl -sS -X POST "$STAGING_API_URL/api/stt" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"audioBase64":"…","format":"lpcm","sampleRateHertz":16000,"lang":"ru-RU"}'
# Expect: 200 {ok,text} | 422 No speech | 502 provider (not 503 disabled)
```

**Mobile:** EAS/`Gradle` `staging` с `EXPO_PUBLIC_YC_STT=true` и `EXPO_PUBLIC_YC_STT_MIC=true` (SDK 54 cloud-mic; см. [`expo-sdk-54-upgrade-notes.md`](expo-sdk-54-upgrade-notes.md)).  
`VoiceNoteButton` всегда открывает **микрофон устройства** (не файловый picker):

1. Primary — OS `expo-speech-recognition` (если доступен)
2. Fallback — `expo-av` mic capture → `recognizeSpeechViaApi` → `POST /api/stt` (когда OS STT нет и флаг on)

**Критерий Pass:** health `ycStt: true`; `/api/stt` не 503; silent/real audio → 200 или 422.

---

## Phase 4 — Search tune / cache — **on staging**

Улучшение option C: меньше рекламных сниппетов, кэш и бюджет на `/api/search/ingredients`.

### Что сделано

| Слой | Файл | Поведение |
|------|------|-----------|
| Domain query | [`packages/ai/src/search-ingredients.ts`](../packages/ai/src/search-ingredients.ts) | Запрос вида «состав ингредиенты блюда…»; scoring: composition/allergen hints ↑, ads/скидки ↓ |
| Cache | [`apps/api/src/lib/search-ingredients-cache.ts`](../apps/api/src/lib/search-ingredients-cache.ts) | SHA key по нормализованному query; memory + optional Redis; TTL `SEARCH_CACHE_TTL_MS` (fallback `SCAN_CACHE_TTL_MS`) |
| Budget | same | `SEARCH_DAILY_BUDGET` (fallback `SCAN_DAILY_BUDGET`) на identity; 429 при превышении |
| Route | [`search-ingredients.ts`](../apps/api/src/routes/search-ingredients.ts) | cache hit → `{ ok, …, cached: true }` без Yandex call; miss → Search API → store → `cached: false` |
| Mobile | уже `EXPO_PUBLIC_YC_SEARCH=true` на EAS staging | `searchIngredientsViaApi` после OFF/catalog miss |

### Как тестировать на stage

```bash
curl -sS -X POST "$STAGING_API_URL/api/search/ingredients" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"query":"оливье"}'
# 200 { ok, ingredients, source: yandex_gen|yandex_web, cached: false }
# повтор того же query → cached: true (на том же instance; memory store)

./scripts/staging-yandex-ai-smoke.sh   # includes search + cache WARN if multi-instance
```

**Mobile:** сканер → визуальное блюдо без OFF → должен уйти в search → затем LLM/mock по составу.

**Критерий Pass:** health `ycSearch: true`; первый запрос 200 или 404 (не 503); при 200 повтор → `cached: true` или WARN multi-instance.

---

## Smokes

```bash
./scripts/yc-ai-phase0-smoke.sh --from-lockbox   # credentials
./scripts/staging-scan-smoke.sh                  # JWT + scan cache
./scripts/staging-yandex-ai-smoke.sh             # intent + search + ocr + scan + stt
./scripts/staging-preflight.sh                   # includes yandex-ai smoke
```

Manual APK (EAS `staging`): see [`qa-checklist.md`](./qa-checklist.md) § «Yandex AI scanner staging» (+ STT when build has `EXPO_PUBLIC_YC_STT`).

**Deployed image (this roll-out):** `cr.yandex/crpf0kl3mrg2qnnd374l/aclearo-api` tag commit with Phase 3+4; Lockbox `YC_STT_ENABLED=true`.

---

## Next

1. **Client QA** on EAS staging APK (Y.1–Y.5 + STT reachability)
2. Optional `YC_GPT_MODEL` A/B after metrics
3. Option D multimodal — **implemented** (enable Lockbox `AI_DISH_VISION_ENABLED` + VL model)
4. ~~Wire `VoiceNoteButton` → mic → `recognizeSpeechViaApi`~~ **done** (`voice-mic-recording-service` + dictation orchestration)

Offline-first и feature flags: без флагов приложение работает как раньше (A heuristic + demo OCR + mock).
