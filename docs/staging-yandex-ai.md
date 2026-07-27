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

## Next

- Phase 2: Vision OCR  
- Phase 3: SpeechKit STT fallback  
- Phase 4: Search API  
