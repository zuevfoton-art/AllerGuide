# GCP: Maps + Pollen keys for AllerGuide staging

Пошаговый ops-runbook: создать GCP-проект, включить billing и APIs, выпустить **отдельные** ключи для Android / iOS / Web / Pollen proxy.

Код уже готов (default off). Без этих ключей слой «Пыление» остаётся на Яндексе + Open-Meteo.

Связано: [`android-stage-build.md`](./android-stage-build.md) · [`eas-staging-build.md`](./eas-staging-build.md) · [`yandex-pollen-map-integration.md`](./yandex-pollen-map-integration.md) §4.6.5

**Package / bundle:** `com.aclearo.app`  
**Staging API (пример):** `https://api.staging.aclearo.com`

---

## 0. Что получите в итоге

| Ключ (имя в Console) | Куда кладёте | Env |
|----------------------|--------------|-----|
| `aclearo-staging-maps-android` | EAS project secret | `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` *(или отдельный android-only; см. §5)* |
| `aclearo-staging-maps-ios` | EAS / app.config iOS | тот же или отдельный iOS secret |
| `aclearo-staging-maps-js` | EAS / web staging env | `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` для web |
| `aclearo-staging-pollen-server` | API staging secrets **только** | `GOOGLE_POLLEN_API_KEY` + `POLLEN_HEATMAP_ENABLED=true` (heatmap **и** forecast) |
| `aclearo-staging-places-server` | API staging secrets **только** | `GOOGLE_PLACES_API_KEY` + `MAP_PLACES_ENABLED=true` |
| `aclearo-staging-air-quality-server` | API staging secrets **только** | `GOOGLE_AIR_QUALITY_API_KEY` + `AIR_QUALITY_ENABLED=true` (один Maps Platform key может закрыть Places + AQ, **не** Pollen-only) |

Минимум для Android stage smoke: **Maps Android + Pollen server**.  
iOS и JS — когда понадобится TestFlight / web heatmap.

---

## 1. GCP проект + billing

### 1.1. Создать проект

1. Откройте [Google Cloud Console](https://console.cloud.google.com/).
2. Сверху слева: селектор проекта → **New Project**.
3. **Project name:** например `aclearo-staging`.
4. Organization / Location — по вашей оргструктуре (или No organization).
5. **Create** → дождитесь создания → выберите этот проект в селекторе.

### 1.2. Привязать Billing

1. Меню ☰ → **Billing**.
2. Если billing не связан: **Link a billing account** / **Manage billing accounts**.
3. Создайте или выберите существующий платёжный аккаунт (карта / счёт организации).
4. Убедитесь, что у проекта `aclearo-staging` статус billing = **linked / active**.

Без billing Maps SDK и Pollen API не работают (или сразу отдают ошибки квоты/биллинга).

### 1.3. Бюджет (рекомендуется сразу)

1. Billing → **Budgets & alerts** → **Create budget**.
2. Scope: этот проект.
3. Amount: например **$20–50 / month** на stage.
4. Alerts: 50% / 90% / 100% на email владельца.

Pollen Usage — Pro SKU (~5 000 free/мес, далее платно за 1 000 вызовов); pan/zoom карты жрёт тайлы быстро.

---

## 2. Включить API

1. ☰ → **APIs & Services** → **Library** (или **Enabled APIs & services** → **+ Enable APIs**).
2. Найдите и нажмите **Enable** для каждого:

| API | Зачем |
|-----|--------|
| **Maps SDK for Android** | Basemap в staging APK |
| **Maps SDK for iOS** | Basemap в staging iOS |
| **Maps JavaScript API** | Basemap + overlay на web |
| **Pollen API** | `heatmapTiles` + `forecast:lookup` через наш proxy |
| **Places API (New)** | Live рестораны / кафе / медицина / аптеки через `/api/places/nearby` (`places:searchNearby`). Legacy «Places API» недоступен для новых проектов с 01.03.2025 |
| **Air Quality API** | `currentConditions:lookup` + AQ heatmap tiles через `/api/air-quality/*` (флаг `AIR_QUALITY_ENABLED`) |

3. Проверка: **Enabled APIs & services** — все шесть в списке.

---

## 3. Создать 2–4 ключа (не один «на всё»)

Идите в **APIs & Services** → **Credentials** → **+ Create credentials** → **API key**.  
После создания сразу **Edit API key** (карандаш) и задайте имя + restrictions.

### 3.1. Maps Android — `aclearo-staging-maps-android`

1. Create API key → Rename: `aclearo-staging-maps-android`.
2. **Application restrictions** → **Android apps**.
3. **Add an item**:
   - Package name: `com.aclearo.app`
   - SHA-1 certificate fingerprint:
     - **EAS:** после первого `eas build --profile staging --platform android` → [expo.dev](https://expo.dev) → Project → Credentials → Android Keystore → **SHA-1**  
       (или `eas credentials` в CLI).
     - **Play App Signing** (если APK через Play): Play Console → App integrity → App signing key certificate → SHA-1.
     - Временно для первого smoke можно добавить **два** SHA-1: EAS upload/debug + Play, если они разные.
4. **API restrictions** → **Restrict key** → отметьте только:
   - Maps SDK for Android
5. **Save**.

Скопируйте значение ключа в менеджер секретов (не в git).

> Пока SHA-1 ещё нет: создайте ключ с package name, сохраните; после первого EAS build допишите SHA-1 и Save снова. Без корректного SHA-1 карта на устройстве будет пустой/серой.

### 3.2. Maps iOS — `aclearo-staging-maps-ios`

1. Create API key → `aclearo-staging-maps-ios`.
2. **Application restrictions** → **iOS apps**.
3. **Add an item** → Bundle ID: `com.aclearo.app`.
4. **API restrictions** → только **Maps SDK for iOS**.
5. **Save**.

### 3.3. Maps JS (web) — `aclearo-staging-maps-js`

1. Create API key → `aclearo-staging-maps-js`.
2. **Application restrictions** → **HTTP referrers (web sites)**.
3. Добавьте referrers (по одному на строку), минимум:

```text
http://localhost:5000/*
http://127.0.0.1:5000/*
https://staging.aclearo.com/*
https://staging.aclearo.ru/*
```

Добавьте ваш реальный web-origin staging, если он другой.  
Для **stage web** используйте referrers `http://localhost:5000/*`, `https://staging.aclearo.com/*`, `https://staging.aclearo.ru/*` (и prod при необходимости).  
`*.replit.app` для stage **не** добавлять — stage clients → YC ([`migrate-off-replit-to-yc.md`](./migrate-off-replit-to-yc.md)).

4. **API restrictions** → только **Maps JavaScript API**.
5. **Save**.

### 3.4. Pollen (server) — `aclearo-staging-pollen-server`

1. Create API key → `aclearo-staging-pollen-server`.
2. **Application restrictions** — один из вариантов:
   - **Preferred:** **IP addresses** → публичный egress IP staging API (хостинг / NAT).  
   - Если IP плавающий и stage маленький: **None** (только на короткий stage), но тогда обязателен п.3.
3. **API restrictions** → **Restrict key** → отметьте **только Pollen API** (не Maps).
4. **Save**.

**Никогда** не кладите этот ключ в `EXPO_PUBLIC_*`, EAS mobile secrets для клиента или git.

---

## 4. Куда вставить ключи в AllerGuide

### 4.1. API staging

В secrets хостинга staging API (не в репозиторий):

```bash
POLLEN_HEATMAP_ENABLED=true
GOOGLE_POLLEN_API_KEY=<aclearo-staging-pollen-server>
POLLEN_RATE_LIMIT_MAX=120
POLLEN_RATE_LIMIT_WINDOW_MS=60000
```

На **Yandex Cloud staging** предпочтительно:

```bash
export GOOGLE_POLLEN_API_KEY='…'
export YC_CONTAINER_ID=… YC_REGISTRY_ID=…
BUILD_PUSH=1 ./scripts/yc-stage-phase1-enable-pollen.sh
```

См. [`migrate-off-replit-to-yc.md`](./migrate-off-replit-to-yc.md) Phase 1.

Places API (New) + Air Quality (отдельный Maps Platform server key, не Pollen-only):

```bash
export MAPS_PLATFORM_API_KEY_FILE=/path/to/Maps_Platform_API_Key.txt
# or: export GOOGLE_PLACES_API_KEY='…' GOOGLE_AIR_QUALITY_API_KEY='…'
export YC_CONTAINER_ID=… YC_REGISTRY_ID=…
# BUILD_PUSH=1 if the live image does not yet include /api/places and /api/air-quality
./scripts/yc-stage-enable-places-air-quality.sh
```

Проверка:

```bash
curl -s https://api.staging.aclearo.com/api/health | jq '.features.pollenHeatmap'
# true

curl -sI "https://api.staging.aclearo.com/api/pollen/heatmap/TREE_UPI/6/38/20" | head -n 15
# HTTP/2 200
# content-type: image/png
# cache-control: private, no-store

curl -s https://api.staging.aclearo.com/api/health | jq '.features | {mapPlaces, airQuality}'
# {"mapPlaces":true,"airQuality":true}

./scripts/staging-places-air-quality-smoke.sh
```

### 4.2. Mobile (EAS)

```bash
cd apps/mobile
pnpm exec eas secret:create --scope project \
  --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY \
  --value "<maps-android-or-unified-maps-key>" \
  --type string
```

Профиль `staging` уже ставит `EXPO_PUBLIC_POLLEN_HEATMAP=google`, `EXPO_PUBLIC_MAP_PLACES=true` и `EXPO_PUBLIC_AIR_QUALITY=google` в [`eas.json`](../apps/mobile/eas.json). Клиентский Maps SDK key (`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`) — отдельный; server Places/AQ keys в Lockbox.

Сборка:

```bash
pnpm build:staging:android
# или GitHub Actions → «EAS staging Android» (secret EXPO_TOKEN)
```

См. [`android-stage-build.md`](./android-stage-build.md).

### 4.3. Упрощение на первом stage (опционально)

Если хотите **один** Maps key на Android+iOS+JS только для короткого spike:

- Application restrictions: **None** (плохо для prod)
- API restrictions: Maps SDK Android + Maps SDK iOS + Maps JavaScript API

После smoke — сразу разнести на 3 ключа как в §3.  
Pollen **всегда** отдельным ключом.

Текущий код mobile читает один `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (достаточно для Android/iOS/web stage с одним ключом или с android-ключом на native-сборке).

---

## 5. Как взять SHA-1 для Android

### 5.1. EAS staging / preview

После первого EAS staging build:

```bash
cd apps/mobile
pnpm exec eas credentials -p android
# или UI: expo.dev → project → Credentials → Android → SHA-1
```

Вставьте SHA-1 в ключ §3.1 → Save → пересоберите APK (если карта уже была серой).

### 5.2. GitHub Actions Gradle APK (path C)

Staging Gradle APKs are signed with the committed `apps/mobile/android/app/debug.keystore` (release build type uses the debug signing config).

| Field | Value |
|-------|--------|
| Package | `com.aclearo.app` |
| SHA-1 | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` |

Add this fingerprint as a **second** Android app item on `aclearo-staging-maps-android` (keep the EAS SHA-1 too). Put the same key value in GitHub Actions secret `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (must start with `AIza`).

Without this SHA-1 (or with a non-`AIza` value baked into the APK) the device shows a **blank beige map with the Google logo** while pollen numbers still load.

---

## 6. Чеклист «готово»

- [ ] Проект `aclearo-staging` + billing linked
- [ ] Budget alert включён
- [ ] 6 API enabled (Maps Android/iOS/JS + Pollen + Places New + Air Quality)
- [ ] Maps Android key + package + SHA-1
- [ ] Maps iOS key + bundle (если нужен iOS)
- [ ] Maps JS key + referrers (если нужен web)
- [ ] Pollen server key + API restriction только Pollen
- [ ] API env: `POLLEN_HEATMAP_ENABLED` + `GOOGLE_POLLEN_API_KEY` → health / tile 200
- [ ] Lockbox Places + AQ: `pnpm yc-stage-enable-places-air-quality` → health `mapPlaces`/`airQuality` + smoke
- [ ] EAS secret Maps key → `eas build --profile staging --platform android`
- [ ] На устройстве: Карта → Пыление → Google map + UPI слой + OM-бейдж

---

## 7. Типичные ошибки

| Симптом | Причина | Что сделать |
|---------|---------|-------------|
| Серый / пустой Google map в APK (логотип Google есть) | Неверный SHA-1 / package / Maps Android API не enabled / в APK попал не-`AIza` ключ | §3.1 + §5; для Gradle CI добавьте SHA-1 из §5.2; секреты только `AIza…` |
| В APK `geo.API_KEY` = текст ошибки (`The bearer token is invalid.`) | CI принял stdout от `eas env:get` без валидации | Workflow должен требовать `AIza…`; починить `EXPO_TOKEN` / задать GH secret |
| Tile proxy 403 | Billing / Pollen API / ключ / IP restriction | Проверить §1–3.4 и логи API |
| Пыление всё ещё Яндекс | Нет Maps key в EAS или `EXPO_PUBLIC_POLLEN_HEATMAP` ≠ `google` | Secret + rebuild; профиль staging |
| Огромный счёт | Один unrestricted key + кэш/prefetch (запрещён ToS) | Разнести ключи; budget; rate limit API |
| Web: RefererNotAllowedMapError | Referrer не в списке | Добавить exact origin + `/*` |

---

## Не коммитить

- Значения API keys
- SHA-1 вместе с приватным keystore (SHA-1 fingerprint публичен — ок в docs команды; ключ — нет)
- `GOOGLE_POLLEN_API_KEY` / `GOOGLE_PLACES_API_KEY` / `GOOGLE_AIR_QUALITY_API_KEY` в `EXPO_PUBLIC_*` или клиентский бандл
