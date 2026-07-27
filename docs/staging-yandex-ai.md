# Staging — Yandex AI (Phase 0)

Подготовка credentials в Yandex Cloud для будущих фаз: сканер (YandexGPT), OCR (Vision), голос (SpeechKit STT), поиск (Search API).

**Приложение пока не вызывает эти API** (`AI_SCAN_ENABLED` остаётся выключенным до Phase 1).

---

## Что создано

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
| `AI_PROVIDER` | `yandex` (hint для Phase 1; scan ещё не включён) |

---

## Создание / ротация API-ключа

```bash
AI_SA=$(yc iam service-account get --name aclearo-staging-ai --format json | jq -r .id)

yc iam api-key create \
  --service-account-id "$AI_SA" \
  --description "Aclearo staging AI" \
  --scopes yc.ai.languageModels.execute,yc.ai.foundationModels.execute,yc.ai.vision.execute,yc.ai.speechkitStt.execute,yc.search-api.execute \
  --format json > /tmp/ai-api-key.json

# Обновите Lockbox: добавьте новую версию с YC_AI_API_KEY / YC_AI_API_KEY_ID
# (остальные entries скопируйте из текущей версии).
# Старый ключ: yc iam api-key delete --id <old-id>
```

Не коммитьте секрет. Не печатайте его в CI logs.

---

## Smoke

```bash
./scripts/yc-ai-phase0-smoke.sh --from-lockbox
# или
export YC_FOLDER_ID=b1glkbb9i8ufp6bsdn4u
export YC_AI_API_KEY=…   # из Lockbox
./scripts/yc-ai-phase0-smoke.sh
```

Ожидание: четыре `OK` (GPT, OCR, STT, Search) → `Phase 0 smoke PASSED`.

---

## Биллинг

В консоли YC для folder должны быть подключены (или доступны по pay-as-you-go) AI Studio / Foundation Models, Vision OCR, SpeechKit, Search API. Если smoke даёт `403` / `PAYMENT_REQUIRED` — проверьте billing account и квоты в каталоге.

---

## Следующие фазы

| Фаза | Что |
|------|-----|
| **1** | Адаптер YandexGPT в `apps/api` `/api/scan` (`AI_PROVIDER=yandex`) |
| **2** | Vision OCR → `packages/ai` / `POST /api/ocr` |
| **3** | SpeechKit fallback для дневника |
| **4** | Search API рядом с OFF |

Offline-first и feature flags не меняются: без флагов приложение работает как раньше.
