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

## Next

- Phase 3: SpeechKit STT fallback  
- Phase 4: Search API  

Offline-first и feature flags: без флагов приложение работает как раньше.
