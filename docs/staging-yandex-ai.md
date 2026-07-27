# Staging — Yandex AI

## Phase 0 — credentials

SA `aclearo-staging-ai`, folder roles, scoped API key in Lockbox (`YC_FOLDER_ID`, `YC_AI_API_KEY`, …).

Smoke: `./scripts/yc-ai-phase0-smoke.sh --from-lockbox` (см. историю Phase 0 / PR credentials).

## Phase 1 — YandexGPT в `/api/scan`

| Item | Detail |
|------|--------|
| Code | `apps/api/src/services/llm-scan-provider.ts` |
| Route | `POST /api/scan` → `callScanLlm()` |
| Env | `AI_PROVIDER=yandex`, `AI_SCAN_ENABLED=true`, `YC_AI_API_KEY`, `YC_FOLDER_ID` |
| Fallback | Mobile `runSmartScan` → mock при 502 / флаге off |
| OpenAI | `AI_PROVIDER=openai` + `OPENAI_*` (default для локальных тестов) |

Lockbox (staging) должен содержать как минимум:

`AI_SCAN_ENABLED=true`, `AI_PROVIDER=yandex`, `YC_FOLDER_ID`, `YC_AI_API_KEY`, плюс прежние DB/JWT keys.

Deploy workflow монтирует эти ключи из Lockbox в Serverless Container revision.

Проверка после деплоя:

```bash
curl -sS -X POST "$STAGING_API_URL/api/scan" \
  -H 'Content-Type: application/json' \
  -d '{"mode":"product","text":"состав: молоко, сахар","allergens":["Молоко"]}'
# при SCAN_REQUIRE_AUTH=true — добавить Bearer JWT
```

`GET /api/health` → `features.aiScan: true`, `features.aiScanProvider: "yandex"`.

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
# tiny PNG base64 smoke (with JWT if SCAN_REQUIRE_AUTH)
B64=iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAD0lEQVR4nGP4jwMwDC0JALoev0Ewkwr8AAAAAElFTkSuQmCC
curl -sS -X POST "$STAGING_API_URL/api/ocr" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"imageBase64\":\"$B64\",\"mimeType\":\"image/png\"}"
```

`GET /api/health` → `features.ycOcr: true` when enabled.

## Next

- Phase 3: SpeechKit STT fallback  
- Phase 4: Search API  
