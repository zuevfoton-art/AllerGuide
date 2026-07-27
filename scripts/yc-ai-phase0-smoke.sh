#!/usr/bin/env bash
# Phase 0 smoke: verify Yandex AI API key can call GPT / Vision / SpeechKit / Search.
# Usage:
#   export YC_FOLDER_ID=b1g…
#   export YC_AI_API_KEY=…
#   ./scripts/yc-ai-phase0-smoke.sh
#
# Or load from Lockbox:
#   ./scripts/yc-ai-phase0-smoke.sh --from-lockbox [secret-id]

set -euo pipefail

LOCKBOX_ID="${YC_LOCKBOX_SECRET_ID:-e6qs399v1b3unstfh5rj}"

if [[ "${1:-}" == "--from-lockbox" ]]; then
  LOCKBOX_ID="${2:-$LOCKBOX_ID}"
  PAYLOAD="$(yc lockbox payload get "$LOCKBOX_ID" --format json)"
  YC_FOLDER_ID="$(echo "$PAYLOAD" | python3 -c "import json,sys; e={x['key']:x.get('text_value','') for x in json.load(sys.stdin)['entries']}; print(e['YC_FOLDER_ID'])")"
  YC_AI_API_KEY="$(echo "$PAYLOAD" | python3 -c "import json,sys; e={x['key']:x.get('text_value','') for x in json.load(sys.stdin)['entries']}; print(e['YC_AI_API_KEY'])")"
  export YC_FOLDER_ID YC_AI_API_KEY
fi

: "${YC_FOLDER_ID:?set YC_FOLDER_ID or use --from-lockbox}"
: "${YC_AI_API_KEY:?set YC_AI_API_KEY or use --from-lockbox}"

AUTH="Authorization: Api-Key ${YC_AI_API_KEY}"
FOLDER_H="x-folder-id: ${YC_FOLDER_ID}"
NOLOG="x-data-logging-enabled: false"
FAIL=0

check() {
  local name="$1" code="$2" body="$3"
  if [[ "$code" == "200" ]]; then
    echo "OK  $name (HTTP $code)"
  else
    echo "FAIL $name (HTTP $code)"
    echo "$body" | head -c 400
    echo
    FAIL=1
  fi
}

echo "== YandexGPT (yandexgpt-lite) =="
BODY=$(curl -sS -w "\n%{http_code}" \
  -X POST "https://llm.api.cloud.yandex.net/foundationModels/v1/completion" \
  -H "Content-Type: application/json" \
  -H "$AUTH" -H "$FOLDER_H" -H "$NOLOG" \
  -d "{
    \"modelUri\": \"gpt://${YC_FOLDER_ID}/yandexgpt-lite\",
    \"completionOptions\": {\"stream\": false, \"temperature\": 0.1, \"maxTokens\": \"16\"},
    \"messages\": [{\"role\": \"user\", \"text\": \"Ответь одним словом: ок\"}]
  }")
CODE=$(echo "$BODY" | tail -n1)
RESP=$(echo "$BODY" | sed '$d')
check "foundationModels/completion" "$CODE" "$RESP"

echo "== Vision OCR =="
# Minimal 8×8 PNG (empty page is fine — we only check auth + API reachability)
B64="iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAD0lEQVR4nGP4jwMwDC0JALoev0Ewkwr8AAAAAElFTkSuQmCC"
BODY=$(curl -sS -w "\n%{http_code}" \
  -X POST "https://ocr.api.cloud.yandex.net/ocr/v1/recognizeText" \
  -H "Content-Type: application/json" \
  -H "$AUTH" -H "$FOLDER_H" -H "$NOLOG" \
  -d "{\"mimeType\":\"PNG\",\"languageCodes\":[\"ru\",\"en\"],\"model\":\"page\",\"content\":\"$B64\"}")
CODE=$(echo "$BODY" | tail -n1)
RESP=$(echo "$BODY" | sed '$d')
check "ocr/recognizeText" "$CODE" "$RESP"

echo "== SpeechKit STT =="
# 0.3s silence LPCM 16 kHz mono
python3 - <<'PY'
import wave
with wave.open("/tmp/yc-ai-smoke-silent.wav", "w") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(16000)
    w.writeframes(b"\x00\x00" * 4800)
PY
BODY=$(curl -sS -w "\n%{http_code}" \
  -X POST "https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?lang=ru-RU&folderId=${YC_FOLDER_ID}&format=lpcm&sampleRateHertz=16000" \
  -H "$AUTH" \
  --data-binary @/tmp/yc-ai-smoke-silent.wav)
CODE=$(echo "$BODY" | tail -n1)
RESP=$(echo "$BODY" | sed '$d')
check "speechkit/stt:recognize" "$CODE" "$RESP"
rm -f /tmp/yc-ai-smoke-silent.wav

echo "== Search API (async web) =="
BODY=$(curl -sS -w "\n%{http_code}" \
  -X POST "https://searchapi.api.cloud.yandex.net/v2/web/searchAsync" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d "{\"query\":{\"searchType\":\"SEARCH_TYPE_RU\",\"queryText\":\"молоко\"},\"folderId\":\"${YC_FOLDER_ID}\"}")
CODE=$(echo "$BODY" | tail -n1)
RESP=$(echo "$BODY" | sed '$d')
check "searchapi/web/searchAsync" "$CODE" "$RESP"

if [[ "$FAIL" -ne 0 ]]; then
  echo "Phase 0 smoke FAILED"
  exit 1
fi
echo "Phase 0 smoke PASSED"
