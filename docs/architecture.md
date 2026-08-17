# AllerGuide — архитектура

AllerGuide — offline-first приложение для управления аллергией (Expo / React Native, Web + native). Пользовательский интерфейс на русском и ещё пяти языках. Ядро продукта работает **без сети**: профили, дневник, SOS, сканер (mock/keyword + опционально LLM), PDF-отчёты. Backend (`apps/api`) — **опциональный**: JWT-аутентификация, каталог продуктов, LLM-скан, OCR, поиск состава, карта пыления, маркетплейс, облачный бэкап.

Репозиторий — **pnpm workspaces + Turborepo** monorepo.

> **Правила разработки:** при написании кода обязательно следовать [`docs/development-rules.md`](./development-rules.md). Этот документ описывает *что* и *как устроено*; правила — *куда класть код* и *что запрещено*.  
> **Навигация по файлам:** [`docs/codebase-index.md`](./codebase-index.md) — карта экранов, сервисов, пакетов и таблица «куда менять X».

---

## Содержание

1. [Структура monorepo](#структура-monorepo)
2. [Высокоуровневая схема](#высокоуровневая-схема)
3. [Mobile-приложение](#mobile-приложение)
4. [Локальное хранилище данных](#локальное-хранилище-данных)
5. [Сканер: сквозной поток](#сканер-сквозной-поток)
6. [Аутентификация и сессии](#аутентификация-и-сессии)
7. [Backend API](#backend-api)
8. [Shared-пакеты](#shared-пакеты)
9. [Интернационализация (i18n)](#интернационализация-i18n)
10. [CI и деплой](#ci-и-деплой)
11. [Наблюдаемость](#наблюдаемость)
12. [Масштабирование](#масштабирование)
13. [Переменные окружения](#переменные-окружения)

**План MVP → prod (Phase 1–2):** детальные GitHub issues с зависимостями — [`docs/phase1-phase2-issues.md`](./phase1-phase2-issues.md) · сводка фаз — [`docs/roadmap-to-prod.md`](./roadmap-to-prod.md).

**Карта (Google + пыление + POI):** единый экран [`apps/mobile/app/(tabs)/map.tsx`](../apps/mobile/app/(tabs)/map.tsx) — выбор аллергена в модалке под слоем «Пыльца», Google basemap/heatmap (флаги), multi-day прогноз, UPI, пины ресторанов/клиник. Выбор basemap — [`resolveMapBasemap`](../apps/mobile/src/services/map-basemap.ts): Google primary при `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` + (`EXPO_PUBLIC_GOOGLE_MAP_PRIMARY` / `EXPO_PUBLIC_POLLEN_HEATMAP=google`); иначе `EXPO_PUBLIC_YANDEX_MAP_INTERACTIVE` (JS embed через API); иначе статичный Yandex overview. При `EXPO_PUBLIC_MAP_POLLEN_GOOGLE_PRIMARY` числа/прогноз карты — Google Pollen (wellness остаётся на Open-Meteo; nearby — OM secondary); при `EXPO_PUBLIC_MAP_POLLEN_PLUME` — geo-шлейф (Circle/Polyline) + hourly wind/pollen series + refresh 15 мин. Атрибуция ToS под картой; analytics `map_pollen_*`; ops `GET /api/ops/map-pollen-health` / `pnpm map-pollen-ops-check`. План — [`docs/interactive-pollen-map-plan.md`](./interactive-pollen-map-plan.md) · Phase 4 — [`docs/yandex-interactive-basemap-spike.md`](./yandex-interactive-basemap-spike.md). Ключи GCP — [`docs/gcp-pollen-maps-keys.md`](./gcp-pollen-maps-keys.md). Stage APK: [`docs/android-stage-build.md`](./android-stage-build.md).

---

## Структура monorepo

```
/
├── apps/
│   ├── mobile/          # Expo Router — основной продукт (Web + iOS + Android)
│   └── api/             # Express + Drizzle + PostgreSQL (опционально)
├── packages/
│   ├── core/            # Доменная логика, типы, справочники (без React)
│   ├── ai/              # Сканер, OCR, scan-intent, search-ingredients, LLM
│   └── ui/              # Общие RN-компоненты (минимальный набор)
├── docs/                # Архитектура, QA, деплой, клинические фичи
├── scripts/             # Staging smokes, YC Lockbox/deploy, APK helpers, RC-gate
├── .github/workflows/   # CI, Neon preview, staging deploy, EAS/APK, Maestro
├── turbo.json           # Граф задач Turborepo (build, lint, typecheck, test)
└── package.json         # Корневые скрипты: pnpm typecheck | test | lint | rc-gate
```

### Граф зависимостей

| Пакет | Зависит от |
|-------|------------|
| `apps/mobile` | `@allerguide/core`, `@allerguide/ai`, `@allerguide/ui` |
| `apps/api` | `@allerguide/core`, `@allerguide/ai` |
| `@allerguide/ai` | `@allerguide/core` |
| `@allerguide/ui` | React Native (peer) |

**Правило:** вся бизнес-логика, не привязанная к UI или HTTP, живёт в `packages/core`. Сканирование, OCR, intent/search — в `packages/ai`. Mobile и API — тонкие адаптеры (экраны, сервисы, маршруты).

---

## Высокоуровневая схема

```mermaid
flowchart TB
  subgraph client ["Mobile (Expo)"]
    UI["Expo Router screens"]
    SVC["src/services/*"]
    subgraph local ["Local persistence"]
      SQL["SQLite (native)"]
      IDB["IndexedDB (web)"]
    end
    UI --> SVC --> local
  end

  subgraph shared ["Shared packages"]
    CORE["@allerguide/core"]
    AI["@allerguide/ai"]
  end

  subgraph api ["API (optional)"]
    EXP["Express"]
    PG[("PostgreSQL")]
    OFF["Open Food Facts"]
    LLM["YandexGPT / OpenAI-compatible"]
    VIS["Yandex Vision OCR"]
    POL["Google Pollen tiles"]
    MKT["Yandex Market"]
    EXP --> PG
    EXP --> OFF
    EXP --> LLM
    EXP --> VIS
    EXP --> POL
    EXP --> MKT
  end

  SVC --> CORE
  SVC --> AI
  AI --> CORE
  SVC -.->|feature flags| EXP
```

**Режимы работы:**

| Режим | Описание |
|-------|----------|
| **Offline (по умолчанию)** | Local DB + keyword-сканер из `@allerguide/ai` |
| **+ Backend auth** | JWT, профили на сервере, dual-write с локальной копией — [ADR 001](adr/001-dual-write.md) |
| **+ Product DB** | Штрихкод: Postgres-каталог → локальный cache → OFF |
| **+ AI scan** | LLM через `POST /api/scan` с кэшем и дневным бюджетом |
| **+ YC OCR** | Vision OCR через `POST /api/ocr` (offline demo fallback) |
| **+ Scan intent** | Классификация OCR: label/menu vs visual product (`POST /api/scan/intent`) |
| **+ Search ingredients** | Yandex Search API при промахе OFF/каталога (`POST /api/search/ingredients`) |
| **+ Cloud sync** | AES-GCM бэкап на сервер (zero-knowledge) |
| **+ Pollen heatmap** | Google Maps + pollen tiles (fallback: Yandex / Open-Meteo) |

Все опции включаются **флагами** (см. [Переменные окружения](#переменные-окружения)); в `.env.example` всё выключено.

---

## Mobile-приложение

Каталог: `apps/mobile/`. Стек: Expo 55, React Native 0.83, Expo Router 55, Zustand, expo-sqlite / IndexedDB. New Architecture обязательна (SDK 55+).

### Слои

```
app/                  # Экраны (Expo Router, file-based routing)
src/components/       # Переиспользуемые UI-компоненты
src/services/         # Оркестрация, локальная БД, API-клиенты
src/db/               # Инициализация БД, миграции, web-store
src/store/            # Глобальный UI-state (Zustand)
src/i18n/             # Локализация (6 языков)
src/constants/        # Feature flags, тема, типографика, бренд
src/hooks/            # Тема, шрифты, адаптив, wizard
src/modules/marketplace/  # UI вкладки Market
metro.config.js       # Monorepo resolution, web-stubs (i18next, crypto)
```

Экраны **не** обращаются к БД напрямую — только через `src/services/*`.

### Роутинг (Expo Router)

**Bootstrap** (`app/index.tsx`):

1. `initDb()` — создание таблиц / загрузка IndexedDB
2. Replit callback (`?replit_auth=1` на web) → `loginWithReplitExchange()` → JWT
3. `restoreAuthSession()` — гидратация токена из SecureStore / settings и **await** `syncProfilesFromBackend` (при backend auth)
4. Проверка `isAuthenticated()` → иначе `/login`
5. `refreshProfilesFromBackend()` + `ensureActiveProfileLoaded({ preferSelf: true })` — активный профиль сразу в store; при нескольких профилях выбирается родитель (`self`)
6. `resolveAuthedBootstrapRoute()` из `@allerguide/core` (intro + onboarding + home)

**Стек аутентификации и onboarding:**

| Маршрут | Назначение |
|---------|------------|
| `login.tsx`, `register.tsx` | Локальная или backend-аутентификация |
| `forgot-password.tsx`, `reset-password.tsx` | Сброс пароля (backend) |
| `onboarding-intro.tsx` | Вводная карусель |
| `onboarding.tsx` | Выбор сценария: `self` / `child` / `both` |
| `profile-setup.tsx` | Мастер создания профиля |
| `profile-edit.tsx` | Редактирование профиля |
| `profile.tsx` | Хаб аккаунта: профили, тема, язык, бэкап, lock, регион пыления |
| `profiles.tsx`, `settings.tsx` | Legacy — `<Redirect href="/profile" />` |

**Вкладки** (`app/(tabs)/_layout.tsx`) — все видимы:

| Вкладка | Файл | Функция |
|---------|------|---------|
| Главная | `home.tsx` | `ScreenBrandHeader`, двухслойный wellness, plain-language insights, reminder терапии |
| Дневник | `diary.tsx` | «Новая запись» (picker → секция), «Настроить курс», история, модули наблюдения |
| Сканер | `scanner.tsx` | Штрихкод, OCR, ручной ввод |
| Маркет | `market.tsx` | Safe-product marketplace (Yandex Market) |
| Карта | `map.tsx` | Пыление / места (Yandex; опц. Google heatmap) |
| SOS | `sos.tsx` | Emergency-only: паспорт и контакты только для чтения |

**Дополнительные экраны (stack):** `about.tsx`, `notifications.tsx`, `expert.tsx`, `doctor-report.tsx`, `clinical-scales.tsx`, `asit-course.tsx`, `prescribed-therapy.tsx`, `asthma-action-plan.tsx`, `insect-action-plan.tsx`, `food-drug-registry.tsx`, `sos-edit.tsx` (вход из `/profile`), `legal/terms.tsx`, `legal/privacy.tsx`.

### Onboarding

Сценарий `both` запускает **двухшаговый wizard**: профиль «Я» → профиль «Ребёнок». Логика в `@allerguide/core`:

- `getWizardStep()` — какой шаг мастера сейчас
- `resolveBootstrapRoute()` / `resolveAuthedBootstrapRoute()` — куда направить после splash
- `shouldCompleteOnboarding()` — когда считать onboarding завершённым

Флаги хранятся в `app_settings`: `onboardingComplete`, `introComplete`, `scenario`.

### Профили

CRUD в `profile-service.ts`: создание, список, редактирование (`/profile-edit`), удаление с каскадом дневника. Хаб — `/profile`. Профили привязаны к `userId` (миграция схемы v2 на native). При `BACKEND_AUTH_ENABLED` — dual-write с `/api/profiles`.

### Глобальное состояние (Zustand)

| Store | Файл | Содержимое |
|-------|------|------------|
| App | `store/app-store.ts` | `scenario`, `activeProfileId`, `activeProfile` |
| Locale | `store/locale-store.ts` | `locale`, хук `useTranslation()` → `t()`, `content()` |
| Theme | `store/theme-store.ts` | `light` / `dark` / `system` |

Основные данные (профили, дневник, история сканов) — в SQLite/IndexedDB, не в Zustand.

### Ключевые сервисы (`src/services/`)

| Сервис | Роль |
|--------|------|
| `scanner-service.ts` | Оркестрация: barcode / text / OCR → intent → dish/search → `runSmartScan` → история |
| `barcode-lookup-service.ts` | Каталог → local cache → OFF (`resolveProductByBarcode`) |
| `barcode-cache-service.ts` | Локальный кэш штрихкодов |
| `catalog-api.ts` / `catalog-cache-service.ts` | Backend catalog + offline snapshot |
| `open-food-facts-service.ts` | Прямой OFF v2 с клиента |
| `scan-intent-api-service.ts` | `POST /api/scan/intent` (+ heuristic fallback в `@allerguide/ai`) |
| `search-ingredients-api-service.ts` | `POST /api/search/ingredients` |
| `scanner-dish-lookup-service.ts` | Обогащение состава блюда (OFF + search) |
| `ocr-api-service.ts` | Cloud Vision OCR через `/api/ocr` |
| `scan-history-service.ts` | Локальная история сканов |
| `profile-service.ts` | CRUD профилей, миграция legacy → userId |
| `auth-service.ts` | Локальные users **или** backend JWT |
| `backend-api.ts` / `api-client.ts` | Обёртки `/api/auth/*`, `/api/profiles/*` |
| `secure-settings-service.ts` | SecureStore (native) / settings (web) для token, recovery key |
| `sync-service.ts` / `sync-restore.ts` | Шифрованный облачный бэкап |
| `backup-crypto.ts` / `backup-file-service.ts` | AES-GCM + локальные файлы бэкапа |
| `diary-service.ts` (+ section/context/attachment) | Дневник |
| `home-insights-service.ts` | Инсайты на главной (`@allerguide/core` `home-insights`; без пользовательских ACT/ARIA/GINA) |
| `wellness-service.ts` | Wellness score + `wellness-display` (словесные категории) |
| `diary-auto-metadata-service.ts` | Скрытые pollen/scan/meds metadata при save |
| `pollen-map-service.ts` / `pollen-heatmap-service.ts` | Open-Meteo + Google pollen tiles |
| `location-service.ts` / `place-service.ts` | Гео / POI (`EXPO_PUBLIC_MAP_PLACES` / catalog + ADAIR fallback) |
| `market-api.ts` | Yandex Market affiliate offers |
| `asit-*-service.ts`, `prescribed-therapy*-service.ts` | АСИТ / терапия + напоминания |
| `asthma-action-plan-service.ts`, `insect-action-plan-service.ts`, `food-drug-registry-service.ts` | Клинические планы |
| `doctor-report-service.ts` | PDF-отчёт для врача |
| `sos-passport-service.ts`, `emergency-contact-service.ts` | SOS и контакты |
| `notification-*-service.ts` | Permissions, copy, deep-links, reconcile |
| `analytics-service.ts` | Opt-in аналитика (`ANALYTICS_EVENT_NAMES`) |
| `error-reporting.ts` | `@sentry/react-native` при `EXPO_PUBLIC_SENTRY_DSN` |

Полный список — [`codebase-index.md`](./codebase-index.md).

### Feature flags (mobile)

Файл: `src/constants/features.ts` (основные). Часть флагов читается напрямую в сервисах.

| Константа / место | Env | Эффект |
|-------------------|-----|--------|
| `BACKEND_AUTH_ENABLED` | `EXPO_PUBLIC_BACKEND_AUTH` | JWT + серверные профили |
| `PRODUCT_DB_ENABLED` | `EXPO_PUBLIC_PRODUCT_DB` | Каталог на backend до OFF |
| `AI_SCAN_ENABLED` | `EXPO_PUBLIC_AI_SCAN_ENABLED` | LLM через `/api/scan` |
| `AI_DISH_VISION_ENABLED` | `EXPO_PUBLIC_AI_DISH_VISION` | Multimodal фото блюда → `/api/scan/dish-vision` |
| `MEDICINE_DB_ENABLED` | `EXPO_PUBLIC_MEDICINE_DB` | Фото упаковки лекарства → `/api/medicines/recognize` |
| `YC_OCR_ENABLED` | `EXPO_PUBLIC_YC_OCR` | Vision OCR через `/api/ocr` |
| `YC_SCAN_INTENT_LLM_ENABLED` | `EXPO_PUBLIC_YC_SCAN_INTENT_LLM` | LLM intent через `/api/scan/intent` |
| `YC_SEARCH_ENABLED` | `EXPO_PUBLIC_YC_SEARCH` | Search ingredients через `/api/search/ingredients` |
| `YC_STT_ENABLED` | `EXPO_PUBLIC_YC_STT` | SpeechKit STT через `/api/stt` (default off) |
| `YC_STT_MIC_ENABLED` | `EXPO_PUBLIC_YC_STT` + `EXPO_PUBLIC_YC_STT_MIC` | Cloud mic (`expo-audio` → `/api/stt`); staging on after SDK 54 |
| `CLOUD_SYNC_ENABLED` | `EXPO_PUBLIC_CLOUD_SYNC` | Облачный бэкап |
| `GOOGLE_POLLEN_HEATMAP_ENABLED` | `EXPO_PUBLIC_POLLEN_HEATMAP=google` | Google Maps + pollen tiles + forecast proxy |
| `GOOGLE_MAP_PRIMARY_ENABLED` | `EXPO_PUBLIC_GOOGLE_MAP_PRIMARY` | Google как primary basemap единого map UX |
| `MAP_PLACES_ENABLED` | `EXPO_PUBLIC_MAP_PLACES` / `EXPO_PUBLIC_LIVE_MAP` | Live Places API (New): Nearby, Autocomplete, Text Search, Details через API |
| `AIR_QUALITY_GOOGLE_ENABLED` | `EXPO_PUBLIC_AIR_QUALITY=google` | Google Air Quality (UAQI + советы) через API proxy |
| `analytics-service.ts` | `EXPO_PUBLIC_ANALYTICS_ENABLED` | Product analytics |
| `error-reporting.ts` | `EXPO_PUBLIC_SENTRY_DSN` | Crash reporting |

По умолчанию все флаги **false** / `off` (см. `.env.example`).

---

## Локальное хранилище данных

Приложение **offline-first**: сеть нужна только для опциональных фич.

### Платформенное разрешение

Импорт всегда `@/src/db/init`. Metro/Expo выбирает реализацию:

| Платформа | Файл | Движок |
|-----------|------|--------|
| iOS / Android | `init.native.ts` | `expo-sqlite` → `allerguide.db` |
| Web | `init.ts` | `WebDb` — SQL-подобный API поверх JSON в IndexedDB |

### Таблицы (native SQLite)

Базовые CREATE в `init.native.ts`, инкременты — в `migrations.ts`:

| Таблица | Назначение |
|---------|------------|
| `profiles` | Профили (`userId`, `allergies`, `allergyConfirmations`, `crossReactionAllergies`, …) |
| `diary_entries` | Записи дневника |
| `diary_attachments` | Фото к записям (v8) |
| `scan_history` | История сканирований |
| `app_settings` | KV: onboarding, locale, theme (не секреты на native) |
| `users` | Локальные учётные записи (offline auth) |
| `emergency_contacts` | Экстренные контакты по profileId |
| `profile_sos` | SOS-заметки |
| `barcode_cache` | Кэш штрихкодов (v3+) |
| `catalog_allergen_snapshot` / `catalog_products` | Offline snapshot каталога (v5+) |
| `alias_feedback` | Локальная очередь alias feedback (v6) |
| `safe_products` | Отмеченные «безопасные» продукты (v7) |

### Web (IndexedDB)

`src/db/web-store.ts`:

- Store `allerguide` / `kv` с in-memory кэшем
- Синхронный API (`loadJson` / `saveJson`) + асинхронная фоновая запись (debounce)
- Одноразовая миграция из устаревшего `localStorage`
- `KNOWN_KEYS`: `ag_profiles`, `ag_diary`, `ag_scan_history`, `ag_barcode_cache`, `ag_profile_sos`, `ag_settings`, `ag_users`, `ag_emergency_contacts`
- Дополнительно через `init.ts`: `ag_safe_products`, `ag_diary_attachments`

`WebDb` (`init.ts`) парсит SQL-строки и маршрутизирует к JSON-коллекциям — тот же интерфейс `DbLike`, что и у SQLite.

### Миграции (`migrations.ts`)

- `CURRENT_SCHEMA_VERSION = 9`
- v1: `schema_version`
- v2: `profiles.userId` (multi-user)
- v3: `barcode_cache`
- v4: нормализация JSON `allergies`
- v5: `allergyConfirmations` + catalog snapshot/products
- v6: allergen ids / `trace_tags` + `alias_feedback`
- v7: `safe_products`
- v8: `diary_attachments`
- v9: `profiles.crossReactionAllergies`
- **Только native** — на web схема неявная в ключах JSON

### Облачный бэкап

Клиент собирает `SyncPayload` (`@allerguide/core`), шифрует AES-GCM (`backup-crypto.ts`), загружает на `POST /api/sync/backup`. Сервер хранит opaque blob — **zero-knowledge**. Cross-device restore — через recovery key (12 слов); см. [Backend → Облачная синхронизация](#облачная-синхронизация-routessyncts).

---

## Сканер: сквозной поток

### Режимы

| Режим | UI | Ввод |
|-------|-----|------|
| `product` | Камера штрихкода / ручной текст | EAN/UPC или состав |
| `menu` | Фото меню | OCR (Vision/demo) или ручной ввод |
| `medicine`, `cosmetics` | Фото упаковки | OCR (Vision/demo) или ручной ввод |

### Диаграмма потока (штрихкод)

```mermaid
sequenceDiagram
  participant UI as scanner.tsx
  participant SS as scanner-service
  participant BL as barcode-lookup
  participant CAT as catalog-api
  participant CACHE as barcode-cache
  participant OFF as Open Food Facts
  participant AI as runSmartScan
  participant LLM as POST /api/scan

  UI->>SS: scanBarcode(barcode, profile)
  SS->>BL: resolveProductByBarcode
  alt PRODUCT_DB_ENABLED
    BL->>CAT: GET /api/products/:barcode
  end
  alt catalog miss
    BL->>CACHE: lookup local cache
  end
  alt cache miss / stale
    BL->>OFF: fetchProductByBarcode
    OFF-->>BL: name, ingredients, tags
  end
  alt продукт не найден
    SS->>AI: analyzeText(barcode as text)
    SS-->>UI: lookupFailed: true
  else продукт найден
    SS->>AI: analyzeText(ingredients)
    alt AI_SCAN_ENABLED
      AI->>LLM: POST /api/scan
      LLM-->>AI: structured verdict
    else LLM off / fail
      AI->>AI: runMockScan (keywords + cross-reactions)
    end
    SS->>SS: saveScanHistory
    SS-->>UI: ScanResult + source
  end
```

### OCR / dish-vision поток (фото)

**Штрихкод** (`scanBarcode`) — отдельный путь, без VL/OCR-перестановки.

**Фото продукта** (`mode=product`, `AI_DISH_VISION`):

1. Сначала `POST /api/scan/dish-vision` (VL: название + вероятные ингредиенты)
2. Затем `extractOcrFromImage` / `POST /api/ocr` — проверка читаемого текста на фото
3. Если OCR-текст ≥ порога (~40 символов) → OCR-путь (intent → lookup → `runSmartScan`), VL-оценка отбрасывается
4. Если OCR вернул короткий сниппет этикетки (есть текст, но < порога) → OCR-путь по сниппету, даже если VL ответил «не блюдо»
5. Если текста нет → результат VL + disclaimer; при сбое VL — явная ошибка (не пустой clear). UI: баббл риска, затем снимок + возможное блюдо + вероятный состав (`ScannerDishVisionCard`)

**Меню / этикетка** (`menu` / `medicine` / `cosmetics`): OCR-first (без VL-first); intent → lookup при `visual_product` → `runSmartScan`.

### Анализ текста (`@allerguide/ai`)

1. **`runSmartScan`** — если задан `llmEndpoint` и сервер доступен → LLM; иначе fallback
2. **`runMockScan`** — keyword-match по аллергенам профиля + перекрёстные реакции из `@allerguide/core`
3. Уровни риска: `low` | `medium` | `high`
4. Дополнительно: `scan-intent.ts`, `search-ingredients.ts`, `prescription-ocr.ts`, `ocr.ts`

### Источники результата (`source`)

| Значение | Значение для пользователя |
|----------|---------------------------|
| `catalog_api` | Каталог backend (Postgres) |
| `barcodes_db` | Локальный / seed barcode DB |
| `openfoodfacts` | Open Food Facts |
| `barcode` | Общий barcode-путь (UI) |
| `ocr` | Распознанный текст упаковки/меню |
| `llm` | Вердикт LLM-скана |
| `dish_vision` | Оценка блюда по фото (multimodal, без этикетки) |
| `manual` | Ручной ввод |

Тип в `@allerguide/ai` `scan.ts`: `'manual' | 'barcode' | 'openfoodfacts' | 'barcodes_db' | 'catalog_api' | 'ocr' | 'llm' | 'dish_vision'`.

### Маппинг аллергенов

Внешние теги (OFF `en:milk`, датасет Food-Allergy) приводятся к канонической RU-таксономии через `mapExternalAllergenNames` в `@allerguide/core` — и при импорте в Postgres, и при write-through с OFF.

---

## Аутентификация и сессии

### Два пути на mobile

```mermaid
flowchart LR
  subgraph offline ["Offline auth (default)"]
    L1["users table в SQLite"]
    L2["PBKDF2 hashPassword"]
  end
  subgraph backend ["Backend auth (flag)"]
    B1["POST /api/auth/login"]
    B2["JWT via secure-settings"]
    B3["syncProfilesFromBackend"]
  end
  subgraph replit ["Replit OIDC (web, optional)"]
    R1["GET /api/login → callback"]
    R2["GET /api/auth/replit-exchange → JWT"]
  end
  offline --> App
  backend --> App
  replit --> backend
```

| Режим | Хранение | Когда |
|-------|----------|-------|
| **Локальный** | `users` в SQLite/IndexedDB, `authUserId` в settings | `BACKEND_AUTH=false` |
| **Backend JWT** | Token через `secure-settings-service` → **SecureStore** (native) / `app_settings` (web) | `BACKEND_AUTH=true` + `JWT_SECRET` на API |
| **Replit OIDC** | Сессия в Postgres `public.sessions`, обмен на JWT для mobile | `REPL_ID` на API; web callback `?replit_auth=1` |

Чувствительные ключи (`authToken`, `recoveryKey`, `backupSecret`, `recoveryKeyConfirmed`) **не** хранятся в SQLite на native — только SecureStore.

JWT: HS256 (`jose`), issuer `allerguide-api`, audience `allerguide-mobile`, TTL 7 дней (`apps/api/src/lib/jwt.ts`).

### Dual-write policy (Phase 1)

При `BACKEND_AUTH_ENABLED` профили пишутся в API и локальную БД; дневник/SOS/сканер остаются локальными; облачный перенос — через encrypted backup. Подробно: [ADR 001: Offline-first dual-write](adr/001-dual-write.md).

---

## Backend API

Каталог: `apps/api/`. Express + Drizzle ORM + PostgreSQL. **Не обязателен** для core flows.

### Точка входа

- `src/index.ts` — HTTP-сервер: `PORT || API_PORT || 5000` (в `.env.example` задано `API_PORT=3001` для локальной разработки)
- `src/app.ts` — фабрика `createApp()`: middleware, маршруты, static/proxy

### Режимы отдачи

| Условие | Поведение |
|---------|-----------|
| `METRO_URL` задан | Proxy на Expo dev server |
| Иначе | Static `apps/mobile/dist` + SPA fallback |

### HTTP-маршруты

| Файл | Эндпоинты |
|------|-----------|
| `routes/mobile-auth.ts` | `POST /api/auth/register`, `login`, `forgot-password`, `reset-password`; `GET verify-reset-token`, `me`, `export`; `DELETE account` |
| `routes/profiles.ts` | `GET/POST /api/profiles`, `GET/PATCH/DELETE /api/profiles/:id` (JWT) |
| `routes/catalog.ts` | `GET /api/allergens`, `GET /api/products/search?q=`, `GET /api/products/:barcode` |
| `routes/medicines.ts` | `POST /api/medicines/recognize`, `GET /api/medicines/search?q=` |
| `routes/scan.ts` | `POST /api/scan` |
| `routes/scan-intent.ts` | `POST /api/scan/intent` |
| `routes/ocr.ts` | `POST /api/ocr` (Yandex Vision) |
| `routes/search-ingredients.ts` | `POST /api/search/ingredients` |
| `routes/sync.ts` | `POST /api/sync/backup`, `GET /api/sync/backup/:userId` |
| `routes/market.ts` | `/api/market/catalog`, offers resolve / draft-search |
| `routes/pollen.ts` | `GET /api/pollen/heatmap/:mapType/:zoom/:x/:y` |
| `routes/alias-feedback.ts` | POST/GET/PATCH alias feedback |
| `routes/analytics.ts` | `POST /api/analytics/events`, dashboard |
| `routes/governance.ts` | `GET /api/governance` |
| Replit auth (если `REPL_ID`) | `GET /api/login`, `/api/callback`, `/api/logout`, `/api/auth/user`, `/api/auth/replit-exchange` |
| — | `GET /api/health` |

### Middleware

| Файл | Функция |
|------|---------|
| `middleware/security.ts` | `helmet`, CORS allowlist (`CORS_ORIGINS`), rate-limit (global + `/api/auth` + `/api/scan` + pollen); `RATE_LIMIT_DISABLED` для тестов |
| `middleware/require-jwt.ts` | Bearer JWT → `req.authUser` |

### Разделение БД на схемы (`profile` и `catalog`)

| Схема | Таблицы | Файл определения |
|-------|---------|------------------|
| **`profile`** | `app_users`, `profiles`, `diary_entries`, `scan_history`, `emergency_contacts`, `profile_sos`, `sync_backups`, `password_reset_tokens` | `src/db/app-schema.ts` |
| **`catalog`** | `allergens`, `cross_reactions`, `products`, `medicines`, `alias_feedback` | `src/db/catalog-schema.ts` |
| **`public`** | `users`, `sessions` (Replit OIDC) | `src/db/auth-schema.ts` |

Drizzle-объекты схемо-квалифицированы — код запросов не меняется. Справочные SQL-артефакты: `sql/profile.sql`, `sql/catalog.sql`. Живая БД — миграции в `drizzle/` (`0000`…`0009_*`).

### Каталог лекарств

- **Таблица:** `catalog.medicines`, дедуп по `normalized_name` (ё→е, без пунктуации). Нет user id и нет байтов фото.
- **Распознавание:** `POST /api/medicines/recognize` — lookup по имени/OCR → VL fallback (`AI_MEDICINE_VISION_ENABLED`) → upsert + счётчик `recognitions`.
- **Поиск:** `GET /api/medicines/search?q=` — только каталог, без LLM.
- **Клиент:** `EXPO_PUBLIC_MEDICINE_DB`; при флаге off / ошибке — локальный `parseMedicineLabelText` / demo.

### Каталог продуктов

- **Сид аллергенов:** `db:seed-allergens` из `@allerguide/core`
- **Импорт штрихкодов:** `db:import-food-allergy` ← `data/food-allergy/`
- **Индексация** (`drizzle/0002_*`): `pg_trgm` + GIN по `name`, полнотекст по `ingredients`, GIN по `allergen_tags`
- **Write-through OFF:** при промахе `GET /api/products/:barcode` тянет товар из OFF и кэширует в `catalog.products` (`PRODUCT_OFF_FALLBACK`, default `true`)
- **Поиск:** `GET /api/products/search?q=` — локальный trigram/FTS, при пустом результате — OFF search

Чтения каталога идут в `readDb` (если задан `READ_DATABASE_URL`), записи — в primary `db`.

### AI-сканер (`routes/scan.ts`, `lib/scan-cache.ts`)

- Кэш результатов (ключ — хэш режима/текста/аллергенов)
- Дневной бюджет на user/IP; биллится только промах кэша
- `SCAN_REQUIRE_AUTH` — опциональное требование JWT
- Провайдер: `AI_PROVIDER=yandex|openai` (default `openai`)
  - **yandex:** `YC_AI_API_KEY`, `YC_FOLDER_ID`, опционально `YC_GPT_MODEL` (default `yandexgpt-lite`)
  - **openai:** `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`
- Реализация: `services/llm-scan-provider.ts`

### Scan intent + search ingredients

| Route | Flag | Сервис |
|-------|------|--------|
| `POST /api/scan/intent` | `YC_SCAN_INTENT_LLM` | классификация OCR-сниппета (label/menu vs visual product) |
| `POST /api/search/ingredients` | `YC_SEARCH_ENABLED` | Yandex Search API → состав при промахе OFF/каталога (+ cache/budget) |
| `POST /api/stt` | `YC_STT_ENABLED` | SpeechKit STT (Phase 3; default off) |

Доменная логика / нормализация — `@allerguide/ai` (`scan-intent.ts`, `search-ingredients.ts`); HTTP — `routes/scan-intent.ts`, `routes/search-ingredients.ts` + `services/yandex-search-ingredients.ts`.

### Vision OCR (`routes/ocr.ts`, `services/yandex-vision-ocr.ts`)

- `YC_OCR_ENABLED=true` + `YC_AI_API_KEY` / `YC_FOLDER_ID`
- Mobile: `EXPO_PUBLIC_YC_OCR` → `ocr-api-service`
- Offline fallback: demo OCR / ручной ввод

### Pollen heatmap (`routes/pollen.ts`)

- Proxy Google Pollen UPI tiles при `POLLEN_HEATMAP_ENABLED` + `GOOGLE_POLLEN_API_KEY`. Species heatmap spike: [`pollen-species-heatmap-spike.md`](./pollen-species-heatmap-spike.md) (**no-go**).
- Proxy Google Pollen Forecast (`GET /api/pollen/forecast`) и Places Nearby (`GET /api/places/nearby`)
- Mobile: `EXPO_PUBLIC_POLLEN_HEATMAP=google` + `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (+ optional `EXPO_PUBLIC_GOOGLE_MAP_PRIMARY`, `EXPO_PUBLIC_MAP_PLACES`)
- Default / offline-safe: Yandex map + Open-Meteo через `pollen-map-service`

### Market (`routes/market.ts`)

- Affiliate offers: `YANDEX_MARKET_CLID` / `OAUTH_TOKEN` / `ERID`
- Опционально curator search: `YANDEX_MARKET_CURATOR_SEARCH`

### Облачная синхронизация (`routes/sync.ts`)

- Payload в `sync_backups` (in-memory fallback без БД)
- Auth: mobile JWT **или** legacy `SYNC_API_KEY`
- Владение по `userId` из токена
- Клиент шифрует до загрузки — сервер zero-knowledge

#### Recovery key flow (cross-device restore)

1. **Setup:** при первой загрузке в облако (`CloudBackupCard`) пользователь создаёт recovery key (12 слов), подтверждает его и только после этого выполняется upload.
2. **Хранение:** ключ на устройстве (`backup-crypto.ts`, SecureStore / web settings); сервер получает только AES-GCM ciphertext.
3. **Legacy migration:** пользователи с device-only ключом видят modal `migrate` перед upload.
4. **Download на новом устройстве:** ввод recovery key → расшифровка → импорт в локальную БД.
5. **Banner:** `RecoveryKeyBanner` на профиле, если ключ создан, но не подтверждён.
6. **Account deletion:** mobile wipe + server cascade (`sync_backups.user_id → app_users.id ON DELETE CASCADE`).

Флаг: `EXPO_PUBLIC_CLOUD_SYNC=true` + API `SYNC_ENABLED=true`. Maestro: `staging-backup-smoke.yaml`.

### Production hardening

- **Безопасность:** helmet, строгий CORS, rate-limiting per-IP
- **Stateless JWT** для mobile — горизонтальное масштабирование API
- **Версионированные миграции:** `db:generate` → SQL в `drizzle/` (коммитится), `db:migrate` через drizzle migrator; `db:push` — только throwaway dev

### Neon (serverless Postgres)

Слой БД (`src/db/index.ts`, `src/db/config.ts`):

| Аспект | Поведение |
|--------|-----------|
| **Pooled vs direct** | Runtime: `DATABASE_URL` (pooled `-pooler`); миграции: `DIRECT_DATABASE_URL` |
| **Опции из env** | `DB_SSL=require`, `DB_PREPARE=false` (PgBouncer), pool tuning |
| **Read replica** | `READ_DATABASE_URL` → `readDb` для каталога; иначе primary |
| **Branching CI** | `.github/workflows/neon-preview.yml` — эфемерная ветка БД на PR |
| **Cold start** | Ленивый синглтон подключения |

`migrate.ts` совмещает Neon direct URL с `prepareReplitAuthBeforeMigrate` для legacy Replit deploy.

---

## Shared-пакеты

### `@allerguide/core` (`packages/core/`)

Чистый TypeScript, Vitest. Публичная поверхность — `src/index.ts`. Основные области:

| Область | Модули (ориентиры) |
|---------|-------------------|
| Types / allergens | `types`, `allergens` (обёртка над `allergen-database`), `allergen-aliases`, `regulatory-allergens`, `catalog`, `barcodes`, `adair-catalog` |
| Profiles | `profile-allergens`, `allergy-confirmations`, `profile-validation`, `profile-setup-wizard`, `profile-condition-gating`, `profile-capabilities`, `condition-*`, `clinical-phenotypes` |
| Diary / home | `diary`, `diary-stats`, `diary-severity`, `diary-triggers`, `diary-profile`, `diary-wizard-route`, `voice-diary`, `home-insights`, `wellness-display` |
| Scan risk | `scan-risk`, `may-contain-parser`, `scan-trends`, `alias-feedback`, `dish-components` |
| Clinical | `gina-asthma`, `pef-zones`, `asthma-action-plan`, `asit-therapy`, `insect-allergy`, `food-drug-allergy`, `prescribed-therapy`, `clinical-scales`, `icd10-reference` |
| SOS / reports | `emergency-contacts`, `allergy-passport`, `doctor-report*` |
| Pollen / geo / market | `pollen-*`, `google-pollen-heatmap`, `geo`, `yandex-map`, `market-offers`, `wellness*` |
| Auth / sync | `auth`, `password`, `phone`, `sync`, `crypto` |
| Ops / content | `onboarding`, `expert-content`, `evidence-registry`, `analytics-events`, `reminder-policy`, `medical-*`, `beta-metrics` |

### `@allerguide/ai` (`packages/ai/`)

| Модуль | Назначение |
|--------|------------|
| `scan.ts` | `runMockScan` — keyword + cross-reactions; тип `source` |
| `smart-scan.ts` | `runSmartScan`, LLM prompt/parse, fallback на mock |
| `ocr.ts` | Нормализация OCR-текста, demo capture |
| `scan-intent.ts` | Heuristic + нормализация intent (label/menu vs visual) |
| `search-ingredients.ts` | Нормализация ответа поиска состава |
| `prescription-ocr.ts` | Парсинг текста рецепта / АСИТ |

### `@allerguide/ui` (`packages/ui/`)

Минимальный набор: `PrimaryButton`, `Badge`. Экраны в основном используют локальные компоненты (`apps/mobile/src/components/`).

---

## Интернационализация (i18n)

Каталог: `apps/mobile/src/i18n/`. **Два стека** (важно для разработчиков):

### Основной — Zustand + typed messages

| Часть | Файлы |
|-------|-------|
| Типы | `types.ts` — `AppLocale` = `ru\|en\|es\|fr\|de\|it`, интерфейс `LocaleMessages` |
| UI-строки | `locales/{ru,en,es,fr,de,it}.ts` |
| Rich content | `content/{locale}.ts` — дневник, экспертные статьи, блоки отчёта |
| Хелперы | `translate.ts` — `localizeScanResult()`, маппинг ошибок |
| Хук | `store/locale-store.ts` → `useTranslation()` — **то, что используют экраны** |

Язык по умолчанию: **ru**. Сохраняется в `app_settings`.

### Legacy — i18next

`i18n/index.ts` — инициализация `i18next` + `react-i18next` (только ru/en). На native **заглушен** через `metro.config.js` (`src/stubs/i18next-stub.js`). Новые строки — только в typed Zustand-стеке.

---

## CI и деплой

### GitHub Actions (`.github/workflows/`)

| Workflow | Назначение |
|----------|------------|
| `ci.yml` | typecheck → lint → test; mobile test gate; API integration |
| `neon-preview.yml` | Эфемерная Neon branch на PR |
| `rc-gate.yml` | Phase 2 RC gate |
| `deploy-staging.yml` / `deploy-staging-yandex.yml` | Staging deploy |
| `eas-staging-android.yml` | EAS staging Android |
| `staging-apk-gradle.yml` | Gradle APK на GitHub |
| `release-apk.yml` | Release APK |
| `maestro-nightly.yml` | Maestro E2E nightly |

Корневые проверки:

```bash
pnpm typecheck   # TypeScript во всех пакетах
pnpm test        # Vitest: core, ai, mobile, api
pnpm --filter mobile lint
pnpm rc-gate     # typecheck + lint + test + doc/Maestro checks
```

### Stage / Replit

Deploy на Replit **снят с поддержки** для stage. Исторический runbook: [`docs/archive/replit-deploy.md`](./archive/replit-deploy.md).

- Stage API: Yandex Cloud — [`staging-yandex-cloud.md`](./staging-yandex-cloud.md)
- Миграция: [`migrate-off-replit-to-yc.md`](./migrate-off-replit-to-yc.md)
- Optional legacy web OIDC: `apps/api/src/replit_integrations` только при `REPL_ID` (не на YC staging Lockbox)

### Android APK

- Local Gradle: `docs/android-local-build.md`
- Stage без SDK: EAS (`docs/android-stage-build.md`, `docs/eas-staging-build.md`) или GitHub Actions
- Preview: `docs/eas-internal-preview.md` · profiles в `apps/mobile/eas.json`

---

## Наблюдаемость

| Компонент | Файл | Включение |
|-----------|------|-----------|
| Аналитика | `analytics-service.ts` | `EXPO_PUBLIC_ANALYTICS_ENABLED`, опц. `EXPO_PUBLIC_ANALYTICS_ENDPOINT` |
| События | `packages/core` `analytics-events.ts` | `screen_view`, `auth_*`, `profile_*`, `diary_*`, `scan_*`, `sync_*`, `backup_*`, `sos_opened`, `wellness_refreshed`, `settings_changed`, `market_click`, `profile_setup_step_*` |
| Crash reporting | `error-reporting.ts` | `@sentry/react-native` при `EXPO_PUBLIC_SENTRY_DSN`; иначе console |

---

## Масштабирование

### В коде (уже есть)

- Stateless JWT для mobile
- Read replica для каталога
- Scan result cache + daily budget
- Lazy DB singleton, Neon pooled/direct split
- Rate limiting, helmet, CORS allowlist
- Optional Redis rate-limit store (`redis-client.ts`)

### Инфраструктура (вне репозитория, при росте)

| Компонент | Зачем |
|-----------|-------|
| Несколько stateless API за LB | Горизонтальное масштабирование (`trust proxy` включён) |
| PgBouncer | Пул соединений при многих инстансах |
| Redis для rate-limit store | Согласованные лимиты между инстансами |
| Read-реплики | Тяжёлые чтения каталога / sync |
| CDN | Static web-сборка |
| Meilisearch / Typesense | Поиск по миллионам SKU (Postgres — source of truth) |

---

## Переменные окружения

Полный список — `.env.example`. Краткая сводка:

### Mobile (`EXPO_PUBLIC_*`)

| Переменная | Default | Назначение |
|------------|---------|------------|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3001` | Base URL backend |
| `EXPO_PUBLIC_BACKEND_AUTH` | `false` | JWT auth + server profiles |
| `EXPO_PUBLIC_PRODUCT_DB` | `false` | Backend catalog lookup |
| `EXPO_PUBLIC_MEDICINE_DB` | `false` | Medicine package recognize + catalog |
| `EXPO_PUBLIC_AI_SCAN_ENABLED` | `false` | LLM scan via API |
| `EXPO_PUBLIC_AI_DISH_VISION` | `false` | Multimodal plate photo → dish + ingredients |
| `EXPO_PUBLIC_YC_OCR` | `false` | Vision OCR via `/api/ocr` |
| `EXPO_PUBLIC_YC_SCAN_INTENT_LLM` | `false` | OCR intent via `/api/scan/intent` |
| `EXPO_PUBLIC_YC_SEARCH` | `false` | Ingredients search via `/api/search/ingredients` |
| `EXPO_PUBLIC_YC_STT` | `false` | SpeechKit STT via `/api/stt` |
| `EXPO_PUBLIC_YC_STT_MIC` | `false` (staging `true`) | Cloud mic fallback when OS speech unavailable |
| `EXPO_PUBLIC_CLOUD_SYNC` | `false` | Encrypted cloud backup |
| `EXPO_PUBLIC_POLLEN_HEATMAP` | `off` | `google` включает Google pollen layer + forecast |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | — | Google Maps SDK / tiles |
| `EXPO_PUBLIC_GOOGLE_MAP_PRIMARY` | `false` | Google как primary basemap map tab |
| `EXPO_PUBLIC_MAP_PLACES` | `false` | Live Places (New) searchNearby via API |
| `EXPO_PUBLIC_LIVE_MAP` | `false` | Alias of `EXPO_PUBLIC_MAP_PLACES` |
| `EXPO_PUBLIC_AIR_QUALITY` | `off` | `google` включает Google Air Quality (wellness + AQ-слой карты) |
| `EXPO_PUBLIC_ANALYTICS_ENABLED` | `false` | Product analytics |
| `EXPO_PUBLIC_ANALYTICS_ENDPOINT` | — | Optional analytics HTTP sink |
| `EXPO_PUBLIC_SENTRY_DSN` | — | Crash reporting |

### API

| Переменная | Назначение |
|------------|------------|
| `PORT` / `API_PORT` | Listen port (code default **5000**; `.env.example` → `3001`) |
| `DATABASE_URL` / `DIRECT_DATABASE_URL` / `READ_DATABASE_URL` | Postgres connections |
| `DB_SSL`, `DB_PREPARE`, `DB_POOL_*` | Neon / PgBouncer tuning |
| `JWT_SECRET` | Mobile JWT signing |
| `SESSION_SECRET` | Replit session cookies |
| `CORS_ORIGINS` | CORS allowlist |
| `RATE_LIMIT_*`, `RATE_LIMIT_DISABLED`, `POLLEN_RATE_LIMIT_*` | Rate limiting |
| `SYNC_ENABLED`, `SYNC_API_KEY` | Cloud sync endpoints |
| `PRODUCT_OFF_FALLBACK`, `OPENFOODFACTS_*` | OFF write-through / UA |
| `AI_SCAN_ENABLED`, `AI_PROVIDER`, `YC_AI_*` / `OPENAI_*` | LLM scan |
| `AI_DISH_VISION_ENABLED`, `YC_VISION_MODEL` / `OPENAI_VISION_MODEL` | Dish photo vision |
| `AI_MEDICINE_VISION_ENABLED` | Medicine package vision (`/api/medicines/recognize`) |
| `YC_OCR_ENABLED` | Vision OCR |
| `YC_SCAN_INTENT_LLM`, `YC_SEARCH_ENABLED`, `YC_STT_ENABLED` | Intent + search ingredients + SpeechKit STT |
| `SCAN_REQUIRE_AUTH`, `SCAN_CACHE_*`, `SCAN_DAILY_BUDGET` | Scan cost controls |
| `POLLEN_HEATMAP_ENABLED`, `GOOGLE_POLLEN_API_KEY` | Pollen tile + forecast proxy |
| `MAP_PLACES_ENABLED`, `GOOGLE_PLACES_API_KEY`, `GOOGLE_MAPS_SERVER_API_KEY` | Places API (New) searchNearby proxy |
| `AIR_QUALITY_ENABLED`, `GOOGLE_AIR_QUALITY_API_KEY` | Air Quality current + heatmap proxy |
| `YANDEX_MARKET_*` | Market affiliate |
| `RESEND_API_KEY`, `EMAIL_FROM`, `PASSWORD_RESET_*` | Password reset email |
| `ALIAS_FEEDBACK_ADMIN_KEY` | Alias feedback admin |
| `REPL_ID`, `ISSUER_URL` | Replit OIDC (optional) |
| `METRO_URL` | Dev proxy to Expo |

**Порты в dev:** mobile web часто на `5000` (`expo start --web --port 5000`); API в коде по умолчанию тоже `5000`, поэтому локально задавайте `API_PORT=3001` (как в `.env.example`).

---

## Связанные документы

| Документ | Тема |
|----------|------|
| `README.md` | Быстрый старт |
| `docs/development-rules.md` | **Обязательные правила разработки** (слои, чеклист, антипаттерны) |
| `docs/codebase-index.md` | Навигационный индекс файлов |
| `AGENTS.md` | Инструкции для разработки / Cloud Agent |
| `docs/functional-requirements.md` | Функциональные требования |
| `docs/clinical-features-raaci.md` | Клинические фичи (RAACI) |
| `docs/archive/replit-deploy.md` | Archived Replit deploy (do not use for stage) |
| `docs/migrate-off-replit-to-yc.md` | Stage без Replit (Phase 0–5 gates) |
| `docs/staging-yandex-cloud.md` | Staging API на Yandex Cloud |
| `docs/eas-internal-preview.md` / `eas-staging-build.md` | EAS / preview / staging builds |
| `docs/qa-checklist.md` | QA чеклист |
| `docs/roadmap-to-prod.md` | Roadmap к production |
| `docs/adr/` | Architecture Decision Records |
