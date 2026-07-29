# Staging — Yandex AI

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
| `AI_SCAN_ENABLED` / `YC_OCR_ENABLED` | флаги Phase 1–2 |
| `YC_SCAN_INTENT_LLM` / `YC_SEARCH_ENABLED` | опции B/C (default off) |

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
| Env | `AI_PROVIDER=yandex`, `AI_SCAN_ENABLED=true`, `YC_AI_API_KEY`, `YC_FOLDER_ID` |
| Fallback | Mobile `runSmartScan` → mock при 502 / флаге off |
| OpenAI | `AI_PROVIDER=openai` + `OPENAI_*` (default для локальных тестов) |

```bash
curl -sS -X POST "$STAGING_API_URL/api/scan" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"mode":"product","text":"состав: молоко, сахар","allergens":["Молоко"]}'
```

`GET /api/health` → `features.aiScan: true`, `features.aiScanProvider: "yandex"`.

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

```bash
B64=… # image base64
curl -sS -X POST "$STAGING_API_URL/api/ocr" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"imageBase64\":\"$B64\",\"mimeType\":\"image/png\"}"
```

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

### B — GPT intent classifier (flag)

| Item | Detail |
|------|--------|
| API | `POST /api/scan/intent` · `YC_SCAN_INTENT_LLM=true` + `AI_SCAN_ENABLED=true` |
| Mobile | `EXPO_PUBLIC_YC_SCAN_INTENT_LLM=true` · `scan-intent-api-service.ts` |
| Domain | `buildScanIntentPrompt` / `parseScanIntentResponse` in `@allerguide/ai` |
| Fallback | Heuristic A при флаге off / 5xx / invalid JSON |

```bash
curl -sS -X POST "$STAGING_API_URL/api/scan/intent" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"text":"Меню: паста карбонара, салат цезарь"}'
```

`GET /api/health` → `features.ycScanIntentLlm: true` when enabled.

Enable B+C on YC staging (Lockbox + redeploy):

```bash
export YC_CONTAINER_ID=bba700s2t35i2khgmiit
export YC_REGISTRY_ID=crpf0kl3mrg2qnnd374l
BUILD_PUSH=1 ./scripts/yc-stage-enable-scan-intent-search.sh
```

### C — Yandex Search ingredients (flag)

| Item | Detail |
|------|--------|
| API | `POST /api/search/ingredients` · `YC_SEARCH_ENABLED=true` + `YC_AI_*` |
| Mobile | `EXPO_PUBLIC_YC_SEARCH=true` · after OFF/catalog miss in `lookupDishIngredientsForScan` |
| Provider | Generative search → web search snippets |
| Fallback | Skip (continue OCR text analysis) when off / 404 |

```bash
curl -sS -X POST "$STAGING_API_URL/api/search/ingredients" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"query":"оливье"}'
```

`GET /api/health` → `features.ycSearch: true` when enabled.

### D — multimodal (future)

Прямой разбор фото без отдельного OCR — не реализован; не ломать offline-first.

---

## Next

- Phase 3: SpeechKit STT fallback  
- Phase 4: tune Search API prompts / caching for option C  

Offline-first и feature flags: без флагов приложение работает как раньше (A heuristic + demo OCR + mock).
