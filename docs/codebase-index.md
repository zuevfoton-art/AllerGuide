# AllerGuide — навигационный индекс кода

Практическая карта репозитория: **куда смотреть** и **что менять** для типичных задач.  
Системный дизайн и потоки данных — [`architecture.md`](./architecture.md). Правила слоёв — [`development-rules.md`](./development-rules.md).

> **Для агентов:** перед задачей открой § [Куда менять X](#куда-менять-x) и § [Фича → файлы](#фича--файлы). Не дублируй бизнес-логику в экранах.

---

## Содержание

1. [Monorepo за 30 секунд](#monorepo-за-30-секунд)
2. [Слои (обязательно)](#слои-обязательно)
3. [Куда менять X](#куда-менять-x)
4. [Фича → файлы](#фича--файлы)
5. [apps/mobile](#appsmobile)
6. [apps/api](#appsapi)
7. [packages/*](#packages)
8. [Feature flags](#feature-flags)
9. [Документы](#документы)
10. [Команды качества](#команды-качества)

---

## Monorepo за 30 секунд

```
/
├── apps/mobile/     # Expo Router — продукт (Web + iOS + Android), offline-first
├── apps/api/        # Express + Drizzle + Postgres — опциональный backend
├── packages/core/   # Домен: типы, таксономия, правила (без React/HTTP)
├── packages/ai/     # Сканер, OCR, scan-intent, search-ingredients, prescription / medicine parse
├── packages/ui/     # Тонкие RN-примитивы (Badge, PrimaryButton)
├── docs/            # Архитектура, QA, staging, clinical
├── scripts/         # RC-gate, taxonomy check, YC stage gates
├── .cursor/         # skills, rules, mcp.json
└── .github/         # CI, EAS, Neon preview
```

| Пакет | Зависит от |
|-------|------------|
| `apps/mobile` | `@allerguide/core`, `@allerguide/ai`, `@allerguide/ui` |
| `apps/api` | `@allerguide/core`, `@allerguide/ai` |
| `@allerguide/ai` | `@allerguide/core` |

---

## Слои (обязательно)

```
app/**/*.tsx          → только UI + вызов сервисов
src/services/*        → оркестрация, локальная БД, опциональный API
packages/core|ai      → домен / сканер
apps/api/src/routes/* → HTTP-адаптер (без бизнес-правил)
```

Offline по умолчанию. Сеть — за `EXPO_PUBLIC_*` флагами.

---

## Куда менять X

| Задача | Где |
|--------|-----|
| Новый экран / маршрут | `apps/mobile/app/**` (+ `_layout` / tabs при необходимости) |
| Логика экрана | `apps/mobile/src/services/*` — **не** в `app/` |
| Доменные правила, таксономия, валидация | `packages/core/src/*` |
| Matching скана / OCR parse / LLM prompt | `packages/ai/src/*` |
| Оркестрация сканера (barcode / OCR / VL) | `scan-analysis`, `scanner-barcode-service`, `scanner-ocr-service`, `scanner-dish-vision-service`; публичный импорт — `scanner-service` |
| Дневник «Питание»: фото / вручную → состав | `NutritionCaptureStep` + `diary-dish-recognition-service` (тот же lookup, что сканер) |
| Строка UI (все 6 локалей) | `apps/mobile/src/i18n/types.ts` + `locales/{ru,en,es,fr,de,it}.ts` |
| Feature flag | `apps/mobile/src/constants/features.ts` + корневой `.env.example` + `eas.json` |
| Локальная схема SQLite | `apps/mobile/src/db/init.native.ts` + `migrations.ts` |
| Web persistence (IndexedDB) | `apps/mobile/src/db/web-store.ts` + `init.ts` |
| API endpoint | `apps/api/src/routes/*` → регистрация в `app.ts` |
| Таблица Postgres | `db/app-schema.ts` или `catalog-schema.ts` → `db:generate` → commit SQL |
| Тема / бренд | `constants/theme.ts`, `brand.ts`, `components/brand/` |
| Analytics event | `packages/core` `analytics-events.ts` + `analytics-service.ts`; skill `product-analyst`; `pnpm check:analytics-taxonomy` |
| UI / токены / a11y | `constants/{theme,layout,typography}.ts` + `components/*`; skill `product-designer`; `docs/brand-claro-green.md` |
| Reminder copy/schedule | `notification-*-service` + core `*-reminder` / `reminder-policy` |
| Maestro E2E | `apps/mobile/.maestro/` · [`maestro.md`](./maestro.md) |
| CJM / сценарии профиля и дневника | [`cjm-profile-diary.md`](./cjm-profile-diary.md) |

---

## Фича → файлы

| Фича | Экраны | Services | Domain / API |
|------|--------|----------|--------------|
| **Scanner** | `(tabs)/scanner.tsx` | `scanner-service` (баррель), `scan-analysis`, `scanner-barcode-service`, `scanner-ocr-service`, `scanner-dish-vision-service`, `barcode-lookup-*`, `ocr-api`, `scan-intent-api`, `search-ingredients-api`, `dish-vision-api`, dish/photo | `@allerguide/ai` (scan, intent, search, dish-vision); API `scan.ts`, `scan-intent.ts`, `scan-dish-vision.ts`, `ocr.ts`, `search-ingredients.ts` |
| **Home insights** | `(tabs)/home.tsx` | `home-insights-service`, `wellness-service` | core `home-insights`, `wellness*`, `wellness-display` |
| **Diary** | `(tabs)/diary.tsx` | `diary-*`, attachments, context, `diary-auto-metadata-service`, `diary-dish-recognition-service` | core `diary*`, `diary-wizard-route`, `dish-components` |
| **Medicine photo / voice** | `MedicinePhotoStep` + `MedicineNameField` in diary / ASIT / therapy / SOS | `medicine-recognition-service`, `medicine-suggest-service`, `medicines-api`, `voice-dictation-service`, hook `use-medicine-suggestions` | core `medicine-catalog`, `food-drug-allergy`, `list-input`; ai `medicine-vision`, `medicine-label`; API `medicines.ts` |
| **Nutrition photo / manual** | `NutritionCaptureStep` + `DishNameField` in diary / scanner | `diary-dish-recognition-service`, `dish-suggest-service`, `scanner-dish-lookup-service` | core `dish-components`, `name-matching`, `data/dishes.json`; API `dishes.ts` |
| **Clinical scales** | `clinical-scales.tsx` | diary-service | core `clinical-scales` |
| **Profiles** | `profile-setup`, `profile`, `profile-edit` | `profile-*`, conditions, phenotype, contacts | core profile*; API `profiles.ts` |
| **SOS** | `(tabs)/sos.tsx` (read-only); `sos-edit.tsx` из `/profile` | `sos-service`, `sos-passport-service`, `emergency-contact-service`, `medicine-suggest-service` | core `allergy-passport`, `emergency-contacts`, `list-input` |
| **Pollen / map** | `(tabs)/map.tsx` | `pollen-map-service`, `pollen-hourly-service`, `wind-service`, `pollen-heatmap-service`, `air-quality-service`, `location-service`, `place-service` | core pollen*, `hourly-series`, `air-quality`, `map-poi`, `pollen-species-heatmap`; API `pollen.ts`, `air-quality.ts`, `places.ts`, `maps.ts`; comps `AirQualityCard`, `PollenIndexCard`, `PlaceSearchBar`, `YandexMap`, `YandexInteractiveMap`, `GooglePollenMap*` |
| **Auth** | `login`, `register`, forgot/reset | `auth-service`, `backend-api`, `secure-settings` | core `auth`/`password`; API `mobile-auth.ts` |
| **Sync / backup** | cards на profile | `sync-service`, `sync-restore`, `backup-crypto`, `backup-file-service` | core `sync`/`crypto`; API `sync.ts` |
| **Product catalog** | scanner (+ market) | `catalog-api`, `barcode-*`, `open-food-facts-service`, `product-service` | core `catalog`; API `catalog.ts` |
| **Market** | `(tabs)/market.tsx` | `market-api`, `market-catalog-cache-service`, `product-service`, `modules/marketplace` | core `marketplace-catalog`, `market-offers`; API `market.ts` + `services/marketplace/*` |
| **Clinical** | `asit-course`, `asthma-action-plan`, `insect-action-plan`, `food-drug-registry`, `prescribed-therapy` | соответствующие `*-service` | core `asit-therapy`, `gina-asthma`, `insect-allergy`, … |
| **i18n** | любой экран через `useTranslation()` | `settings-service` (locale) | `src/i18n/*`, `locale-store.ts` |
| **Doctor report** | `doctor-report.tsx` | `doctor-report-service` | core `doctor-report*` |

---

## apps/mobile

Каталог: `apps/mobile/`. Expo 55 · RN 0.83 · Expo Router 55 · Zustand · SQLite / IndexedDB.

### Структура

```
app/                  # Экраны (file-based routing)
src/components/       # UI-компоненты
src/services/         # Оркестрация (единственная точка для DB/API из UI)
src/db/               # init, migrations, web-store
src/store/            # Zustand: app / locale / theme
src/i18n/             # 6 локалей + types.ts
src/constants/        # features, theme, brand, typography
src/hooks/            # theme, fonts, layout, wizard
src/modules/marketplace/
```

### Маршруты `app/`

| Путь | Назначение |
|------|------------|
| `index.tsx` | Bootstrap: `initDb` → auth → onboarding/home |
| `_layout.tsx` | Root stack, fonts, i18n, ErrorBoundary, AppLockGate |
| `(tabs)/home.tsx` | Dashboard / двухслойный wellness / home-insights |
| `(tabs)/diary.tsx` | Дневник: picker «Новая запись», «Настроить курс», история; курсы терапии/АСИТ — через модалку |
| `clinical-scales.tsx` | Клинические шкалы (не в ленте дневника) |
| `(tabs)/scanner.tsx` | Штрихкод / фото / текст / OCR |
| `(tabs)/map.tsx` | Пыление / места |
| `(tabs)/market.tsx` | Safe-product marketplace |
| `(tabs)/sos.tsx` | SOS emergency-only (без редактирования) |
| `onboarding-intro.tsx` / `onboarding.tsx` | Intro + сценарий |
| `profile-setup.tsx` | Мастер профиля |
| `profile.tsx` / `profile-edit.tsx` | Профиль / редактирование |
| `login.tsx` / `register.tsx` | Auth |
| `forgot-password.tsx` / `reset-password.tsx` | Сброс пароля (backend) |
| `sos-edit.tsx` | Редактор SOS (вход из `/profile`) |
| `notifications.tsx` | Напоминания |
| `doctor-report.tsx` | PDF для врача |
| `asit-course.tsx` / `prescribed-therapy.tsx` | ASIT / терапия |
| `asthma-action-plan.tsx` / `insect-action-plan.tsx` | Планы действий |
| `food-drug-registry.tsx` | Пищево-лекарственный реестр |
| `expert.tsx` / `about.tsx` | Эксперт / о приложении |
| `legal/privacy.tsx` / `legal/terms.tsx` | Legal |
| `profiles.tsx` / `settings.tsx` | Redirect → `/profile` |

### Services (группы)

| Группа | Файлы |
|--------|-------|
| Auth / API | `auth-service`, `backend-api`, `api-client`, `api-errors` |
| Profiles | `profile-service`, `profile-conditions-service`, `profile-capabilities-service`, `profile-symptom-baseline-service`, `condition-history-service`, `clinical-phenotype-service`, `emergency-contact-service` |
| Diary | `diary-service`, `diary-section-service`, `diary-context-service`, `diary-attachment-service`, `diary-photo-picker`, `diary-dish-recognition-service`, `medicine-recognition-service`, `medicine-suggest-service`, `medicines-api` |
| Scanner / catalog | `scanner-service` (баррель), `scan-analysis`, `scanner-barcode-service`, `scanner-ocr-service`, `scanner-dish-vision-service`, `barcode-lookup-service`, `barcode-cache-service`, `catalog-api`, `catalog-cache-service`, `allergen-catalog-service`, `open-food-facts-service`, `product-service`, `safe-products-service`, `scan-history-service`, `scanner-photo-*`, `scanner-dish-*`, `dish-off-enrichment-service`, `ocr-api-service`, `scan-intent-api-service`, `search-ingredients-api-service`, `stt-api-service`, `alias-feedback-service` |
| Home | `home-insights-service`, `wellness-service` |
| SOS / reports | `sos-service`, `sos-passport-service`, `doctor-report-service` |
| Clinical | `asit-*-service`, `asthma-action-plan-service`, `insect-action-plan-service`, `food-drug-registry-service`, `prescribed-therapy*-service`, `clinical-reminder-service`, `reminder-reconcile-service` |
| Pollen / map | `pollen-map-service`, `pollen-heatmap-service`, `pollen-reminder-service`, `location-service`, `place-service`, `wellness-service` |
| Sync / backup | `sync-service`, `sync-restore`, `backup-crypto`, `backup-file-service` |
| Settings / ops | `settings-service`, `secure-settings-service`, `notification-*-service`, `app-lock-service`, `analytics-service`, `error-reporting`, `startup-metrics`, `haptics`, `voice-dictation-service`, `voice-mic-recording-service`, `market-api`, `market-catalog-cache-service` |

### DB / store / i18n

| Путь | Роль |
|------|------|
| `src/db/init.native.ts` | SQLite schema + migrations entry |
| `src/db/migrations.ts` | `CURRENT_SCHEMA_VERSION = 9` (incremental) |
| `src/db/init.ts` | Web `DbLike` над IndexedDB |
| `src/db/web-store.ts` | IndexedDB + in-memory cache + legacy migration |
| `src/store/app-store.ts` | Active profile, scenario |
| `src/store/locale-store.ts` | **`useTranslation()`** — основной i18n |
| `src/store/theme-store.ts` | Light/dark/system |
| `src/i18n/types.ts` | `AppLocale` + `LocaleMessages` |
| `src/i18n/locales/*.ts` | Каталоги строк (ru/en/es/fr/de/it) |

### Components (по смыслу)

- **Shell:** `Screen`, `ScreenHeader`, `GlassCard`, `CardTitle`, `Button`, `Disclaimer`, `Skeleton` (`SkeletonLine` / `SkeletonCard` / `SkeletonBlock`), `EmptyState`, `ErrorBoundary`, `AppLockGate`, `FocusRing`/`SkipLink`, `ListPickerSheet`, …
- **Profile/clinical editors:** `AllergenPicker`, `ConditionPicker`, `*Card`, `EmergencyContactsEditor`, …
- **Diary:** `DiaryWizard`, `DiaryEditorModal`, `MedicinePhotoStep`, `MedicineNameField`, `NutritionCaptureStep`, `diary/*`
- **Maps:** `YandexMap`, `YandexInteractiveMap`, `PollenMapLayer`, `GooglePollenMap(.web)`
- **Backup:** `CloudBackupCard`, `LocalBackupCard`, `RecoveryKey*`
- **Folders:** `brand/`, `onboarding/`, `profile-setup/`

### Config

`app.json` / `app.config.js` · `eas.json` · `metro.config.js` · `android/` · `ios/` · `.maestro/` · корневой `.env.example`

---

## apps/api

Entry: `src/index.ts` → `createApp()` в `src/app.ts`. Порт: `PORT \|\| API_PORT \|\| 5000` (в `.env.example` — `3001`).

### Routes

| Файл | Назначение |
|------|------------|
| `mobile-auth.ts` | Register / login / refresh / forgot / reset / export / delete |
| `profiles.ts` | Profile CRUD (JWT) |
| `sync.ts` | Encrypted backup (`SYNC_ENABLED`) |
| `scan.ts` | LLM smart scan (`AI_SCAN_ENABLED`) |
| `scan-dish-vision.ts` | Multimodal dish photo (`AI_DISH_VISION_ENABLED`) |
| `scan-intent.ts` | OCR intent classify (`YC_SCAN_INTENT_LLM`) |
| `ocr.ts` | Yandex Vision OCR (`YC_OCR_ENABLED`) |
| `search-ingredients.ts` | Yandex Search ingredients (`YC_SEARCH_ENABLED`) + cache |
| `stt.ts` | SpeechKit STT (`YC_STT_ENABLED`) |
| `catalog.ts` | Allergens + products barcode/search (+ OFF) |
| `medicines.ts` | Medicine recognize + catalog search + remember (VL via `AI_MEDICINE_VISION_ENABLED`; writes need JWT or `MEDICINE_WRITE_KEY`) |
| `market.ts` | Market catalog + Yandex resolve / retired draft-search |
| `pollen.ts` | Google pollen heatmap proxy |
| `alias-feedback.ts` | Crowdsourced aliases |
| `analytics.ts` | Event ingest |
| `governance.ts` | Policy metadata |
| Health | `GET /api/health` в `app.ts` |

### DB

| Файл | Schema |
|------|--------|
| `db/app-schema.ts` | `profile.*` — users, profiles, diary, scan_history, contacts, sos, sync_backups |
| `db/catalog-schema.ts` | `catalog.*` — allergens, cross_reactions, products, medicines, market_products, market_offers, alias_feedback |
| `db/config.ts` + `index.ts` | Neon-ready pools; optional `readDb` |
| `drizzle/0000`…`0011_*.sql` | Versioned migrations — **commit SQL**, apply via `db:migrate` |

Миграции: `pnpm --filter api db:generate` → commit → `db:migrate`. Не `db:push` на реальных данных.

### Middleware / services

- Middleware: `security.ts` (helmet/CORS/rate limit), `require-jwt.ts`
- Services: `open-food-facts`, `llm-scan-provider`, `yandex-vision-ocr`, `yandex-speechkit-stt`, `yandex-search-ingredients`, `google-pollen-heatmap`, `yandex-market-affiliate`, `marketplace/*` (YML/pharmacy feed + store), `app-user-service`, `profile-service`, …

---

## packages/*

### `@allerguide/core` — `packages/core/src/`

Barrel: `index.ts`. Pure TS.

| Область | Модули (ориентиры) |
|---------|-------------------|
| Types / allergens | `types`, `allergens`, `allergen-aliases`, `regulatory-allergens`, `catalog`, `barcodes`, `adair-catalog` (`data/adair-registry.json`) |
| Profiles | `profile-*`, `allergy-confirmations`, `condition-*`, `clinical-phenotypes`, `clinical-coding` |
| Diary / home | `diary`, `diary-stats`, `diary-severity`, `diary-triggers`, `diary-profile`, `diary-wizard-route`, `voice-diary`, `home-insights`, `wellness-display`, `medicine-catalog`, `profile-age` |
| Scan risk | `scan-risk`, `may-contain-parser`, `scan-trends`, `alias-feedback`, `dish-components` |
| Clinical | `gina-asthma`, `pef-zones`, `asthma-action-plan`, `asit-therapy`, `insect-allergy`, `food-drug-allergy`, `prescribed-therapy`, `clinical-scales`, `wellness-display`, `diary-wizard-route` |
| SOS / reports | `emergency-contacts`, `allergy-passport`, `doctor-report*` |
| Pollen / geo / market | `pollen-*`, `google-pollen-heatmap`, `geo`, `yandex-map`, `market-offers`, `marketplace-catalog` |
| Sync / crypto | `sync`, `crypto` |
| Ops / content | `onboarding`, `expert-content`, `evidence-registry`, `analytics-events`, `reminder-policy` |

### `@allerguide/ai` — `packages/ai/src/`

| Модуль | Назначение |
|--------|------------|
| `scan.ts` | Offline keyword/rule → `ScanResult` |
| `smart-scan.ts` | LLM prompt + normalize + mock |
| `ocr.ts` | Demo / normalize OCR text |
| `scan-intent.ts` | Heuristic + normalize OCR intent |
| `search-ingredients.ts` | Normalize search-ingredients response |
| `prescription-ocr.ts` | Parse prescription / ASIT text |
| `medicine-vision.ts` | VL prompt/parse for medicine packages |
| `medicine-label.ts` | Offline OCR parse of a package label; `parseMedicineVoiceUtterance` for spoken dose logs |

### `@allerguide/ui` — `packages/ui/src/`

`Badge`, `PrimaryButton`. Основной UI — в `apps/mobile/src/components`.

---

## Feature flags

Источник mobile-констант: `apps/mobile/src/constants/features.ts` (+ прямые `process.env` в отдельных сервисах).

| Mobile (`EXPO_PUBLIC_*`) | Где читается | Server |
|--------------------------|--------------|--------|
| `BACKEND_AUTH` | `features.ts` | `JWT_SECRET` + `DATABASE_URL` |
| `CLOUD_SYNC` | `features.ts` | `SYNC_ENABLED` |
| `AI_SCAN_ENABLED` | `features.ts` | `AI_SCAN_ENABLED` + LLM keys |
| `AI_DISH_VISION_ENABLED` | `features.ts` (`EXPO_PUBLIC_AI_DISH_VISION`) | `AI_DISH_VISION_ENABLED` + VL model |
| `YC_OCR` | `features.ts` (`YC_OCR_ENABLED`) | `YC_OCR_ENABLED` |
| `YC_SCAN_INTENT_LLM` | `features.ts` | `YC_SCAN_INTENT_LLM` |
| `YC_SEARCH` | `features.ts` | `YC_SEARCH_ENABLED` |
| `DISH_LLM` | `features.ts` | `DISH_LLM_ENABLED` + `AI_SCAN_ENABLED` (local/dev **off**; staging **on**) |
| `PRODUCT_DB` | `features.ts` | catalog DB + OFF |
| `MEDICINE_DB` | `features.ts` (`EXPO_PUBLIC_MEDICINE_DB`) | `AI_MEDICINE_VISION_ENABLED` + `catalog.medicines` |
| `POLLEN_HEATMAP=google` | `features.ts` | `POLLEN_HEATMAP_ENABLED` + `GOOGLE_POLLEN_API_KEY` |
| `ANALYTICS_ENABLED` | `analytics-service.ts` | `/api/analytics` |
| `MAP_PLACES` / `LIVE_MAP` (default on) | `features.ts` → `place-service.ts` | `MAP_PLACES_ENABLED` (default on) + Places key |
| `AIR_QUALITY` (default on) | `features.ts` → `air-quality-service.ts` | `AIR_QUALITY_ENABLED` (default on) + AQ key |
| `SENTRY_DSN` | `error-reporting.ts` | — |
| `API_URL` | `api-client` и др. | — |

По умолчанию флаги **выключены** (см. `.env.example`), кроме **Places** и **Air Quality** (default on; `false`/`off` выключает).

---

## Документы

| Когда | Документ |
|-------|----------|
| Слои, потоки, флаги | [`architecture.md`](./architecture.md) |
| Правила / антипаттерны / merge | [`development-rules.md`](./development-rules.md) |
| **Быстрая навигация по файлам** | **Этот файл** |
| Что должен делать продукт | [`functional-requirements.md`](./functional-requirements.md) |
| Фазы / критерии | [`roadmap-to-prod.md`](./roadmap-to-prod.md) |
| Команды / gotchas | [`../AGENTS.md`](../AGENTS.md) |
| RC gate | [`rc-gate.md`](./rc-gate.md) |
| Soak / PR triage | [`staging-soak-log.md`](./staging-soak-log.md) · [`pr-triage-2026-08.md`](./pr-triage-2026-08.md) |
| Privacy / prod YC / store permissions | [`privacy-compliance-audit.md`](./privacy-compliance-audit.md) · [`production-yc-plan.md`](./production-yc-plan.md) · [`store-permissions-justification.md`](./store-permissions-justification.md) |
| QA | [`qa-checklist.md`](./qa-checklist.md) |
| CJM + сценарии (профиль, дневник, capabilities) | [`cjm-profile-diary.md`](./cjm-profile-diary.md) |
| Clinical | [`clinical-features-raaci.md`](./clinical-features-raaci.md) |
| YC stage | [`yc-stage-gates.md`](./yc-stage-gates.md) · [`staging-yandex-cloud.md`](./staging-yandex-cloud.md) |
| ADR | [`adr/`](./adr/) |
| Роли агентов / MCP | [`agents-roles-and-mcp-plan.md`](./agents-roles-and-mcp-plan.md) · [`mcp-servers.md`](./mcp-servers.md) · [`.cursor/skills/`](../.cursor/skills/) · [`.cursor/rules/`](../.cursor/rules/) |

---

## Команды качества

```bash
pnpm install                 # из корня
pnpm typecheck
pnpm test
pnpm --filter mobile lint
pnpm check:analytics-taxonomy
pnpm rc-gate                 # typecheck + lint + test + taxonomy + doc/Maestro
```

Mobile web: `cd apps/mobile && npx expo start --web --port 5000`  
API: `pnpm --filter api dev` (нужны `DATABASE_URL` + `JWT_SECRET`)
