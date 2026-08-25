# EAS Staging — backend-integrated internal build

**Roadmap:** Phase 1 · [P1.2b](phase1-phase2-issues.md)  
**Профиль:** `staging` в [`apps/mobile/eas.json`](../apps/mobile/eas.json)

Internal-сборка для closed beta: **backend auth, cloud sync и AI scan включены**. Требует живой staging API ([`staging-deploy.md`](staging-deploy.md), план: [`staging-infrastructure-plan.md`](staging-infrastructure-plan.md)).

> **Android APK для stage / Google pollen heatmap:** preferred path = **EAS Build** (не локальный SDK в Cursor VM).  
> Сравнение EAS vs GitHub Actions: [`android-stage-build.md`](android-stage-build.md).

> Offline-only smoke без сервера — используйте профиль [`preview`](eas-internal-preview.md).

---

## Отличие от `preview`

| Переменная | `preview` | `staging` |
|------------|-----------|-----------|
| `EXPO_PUBLIC_API_URL` | не задан (localhost по умолчанию в dev) | `https://api.staging.aclearo.com` |
| `EXPO_PUBLIC_BACKEND_AUTH` | `false` | **`true`** |
| `EXPO_PUBLIC_CLOUD_SYNC` | `false` | **`true`** |
| `EXPO_PUBLIC_AI_SCAN_ENABLED` | `false` | **`true`** |
| `EXPO_PUBLIC_YC_OCR` | (нет) | **`true`** |
| `EXPO_PUBLIC_YC_SCAN_INTENT_LLM` | (нет) | **`true`** (нужен API `YC_SCAN_INTENT_LLM`) |
| `EXPO_PUBLIC_YC_SEARCH` | (нет) | **`true`** (нужен API `YC_SEARCH_ENABLED`) |
| `EXPO_PUBLIC_DISH_LLM` | (нет) | **`true`** (нужен API `DISH_LLM_ENABLED` + `AI_SCAN_ENABLED`) |
| `EXPO_PUBLIC_PRODUCT_DB` | `false` | `false` |
| `EXPO_PUBLIC_POLLEN_HEATMAP` | `off` | **`google`** (нужен EAS secret Maps key) |
| `EXPO_PUBLIC_YANDEX_MAP_INTERACTIVE` | (нет) | **`true`** (нужен Lockbox `YANDEX_MAPS_*` — `pnpm yc-stage-enable-yandex-maps`) |
| `EXPO_PUBLIC_MAP_PLACES` | **`true`** (default on) | **`true`** (нужен Lockbox Places — `pnpm yc-stage-enable-places-air-quality`) |
| `EXPO_PUBLIC_AIR_QUALITY` | **`google`** (default on) | **`google`** (нужен Lockbox Air Quality — тот же enable script) |
| EAS channel | `preview` | `staging` |

---

## Предпосылки

1. Staging API доступен: `curl https://api.staging.aclearo.com/api/health` → 200 ([P1.1c](staging-deploy.md))
2. `eas login` и реальный `projectId` в [`app.json`](../apps/mobile/app.json) (см. [preview runbook](eas-internal-preview.md))
3. Apple/Google credentials для internal distribution (те же, что для preview)
4. Для pollen heatmap: пошагово создать GCP keys — [`gcp-pollen-maps-keys.md`](gcp-pollen-maps-keys.md); Maps key в **EAS Sensitive** `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (не Secret visibility); API — Lockbox `POLLEN_HEATMAP_ENABLED` + `GOOGLE_POLLEN_API_KEY` (Phase 1). Stage clients: [`yc-stage-gates.md`](yc-stage-gates.md) Phase 2.

---

## Быстрый старт

```bash
pnpm install
./scripts/first-staging-build.sh          # Android по умолчанию
./scripts/first-staging-build.sh ios
```

Вручную:

```bash
cd apps/mobile
pnpm exec eas login
pnpm build:staging:android
```

**Через GitHub (без локального `eas login`):** Actions → **EAS staging Android** → Run workflow  
([`.github/workflows/eas-staging-android.yml`](../.github/workflows/eas-staging-android.yml), secret `EXPO_TOKEN`). Подробности: [`android-stage-build.md`](android-stage-build.md).

---

## Сборка

```bash
cd apps/mobile

pnpm build:staging              # iOS + Android
pnpm build:staging:android      # APK (рекомендуется для первого smoke)
pnpm build:staging:ios          # TestFlight internal
```

Maps key (один раз на проект Expo):

```bash
cd apps/mobile
pnpm exec eas secret:create --scope project \
  --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY \
  --value "YOUR_RESTRICTED_MAPS_KEY" \
  --type string
```

---

## Smoke после установки (P1.2c)

Детальный чеклист: [`qa-checklist.md` § Staging — backend auth E2E](qa-checklist.md#staging--backend-auth-e2e-p12c).

API smoke (без устройства):

```bash
./scripts/staging-auth-smoke.sh
./scripts/staging-sync-smoke.sh
./scripts/staging-scan-smoke.sh
```

Минимум на устройстве:

1. **Register** — новый email на staging API (S.1)
2. **Cold start** — kill app → reopen, сессия жива (S.3)
3. **Login** после logout (S.2)
4. **Create profile** — dual-write на сервер (S.4)
5. **Manual scan** — ручной ввод состава → источник «ИИ-анализ» (P1.5b / C.1)
6. **Пыление (если GCP keys)** — Google basemap + UPI heatmap + OM-бейдж ([android-stage-build.md](android-stage-build.md))
7. **Места / воздух (если Lockbox Places+AQ)** — live кафе/медицина + Google UAQI ([gcp-pollen-maps-keys.md](gcp-pollen-maps-keys.md))

Далее для closed beta: cross-device backup (P1.4c).

Чеклист cross-device backup: [`qa-checklist.md` § P1.4c](qa-checklist.md#p14c--cloud-sync-cross-device-e2e).  
Чеклист AI scan: [`qa-checklist.md` § P1.5b](qa-checklist.md#p15b--ai-scan-staging-e2e).  
Closed beta: [`closed-beta-p17.md`](closed-beta-p17.md).

---

## Установка на устройство

Как у preview — [expo.dev](https://expo.dev) → Builds → QR / APK link (Android) или TestFlight (iOS). См. [`eas-internal-preview.md` § Распространение](eas-internal-preview.md).

**Важно:** staging и preview используют один `com.aclearo.app` — перед установкой staging APK удалите preview-сборку с тем же package, если установка падает.

---

## Troubleshooting

| Проблема | Решение |
|----------|---------|
| Register/login «Сервер недоступен» | Проверьте P1.1c, URL в `eas.json` staging env |
| Sync «недоступна» | API: `SYNC_ENABLED=true`; на клиенте флаг уже `true` в staging |
| AI scan fallback на mock | API: `AI_SCAN_ENABLED=true`, `OPENAI_API_KEY`, JWT |
| Пыление остаётся на Яндексе | Нет EAS secret Maps key / пустой `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`; или API pollen выключен |
| Build fails | Запускайте из `apps/mobile`; см. [preview troubleshooting](eas-internal-preview.md) |
| Нужен APK без EAS | [`android-stage-build.md`](android-stage-build.md) §C — Gradle on GitHub |

---

## Связанные файлы

- [`apps/mobile/eas.json`](../apps/mobile/eas.json)
- [`apps/mobile/src/constants/features.ts`](../apps/mobile/src/constants/features.ts)
- [`docs/android-stage-build.md`](android-stage-build.md) — EAS vs GitHub
- [`docs/staging-deploy.md`](staging-deploy.md)
- [`docs/adr/001-dual-write.md`](adr/001-dual-write.md)
