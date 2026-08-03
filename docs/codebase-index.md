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
├── packages/ai/     # Сканер, OCR, scan-intent, search-ingredients, prescription parse
├── packages/ui/     # Тонкие RN-примитивы (Badge, PrimaryButton)
├── docs/            # Архитектура, QA, staging, clinical
├── scripts/         # RC-gate, YC stage gates, staging smokes
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
| Строка UI (все 6 локалей) | `apps/mobile/src/i18n/types.ts` + `locales/{ru,en,es,fr,de,it}.ts` |
| Feature flag | `apps/mobile/src/constants/features.ts` + корневой `.env.example` + `eas.json` |
| Локальная схема SQLite | `apps/mobile/src/db/init.native.ts` + `migrations.ts` |
| Web persistence (IndexedDB) | `apps/mobile/src/db/web-store.ts` + `init.ts` |
| API endpoint | `apps/api/src/routes/*` → регистрация в `app.ts` |
| Таблица Postgres | `db/app-schema.ts` или `catalog-schema.ts` → `db:generate` → commit SQL |
| Тема / бренд | `constants/theme.ts`, `brand.ts`, `components/brand/` |
| Analytics event | `packages/core` `analytics-events.ts` + `analytics-service.ts` |
| Reminder copy/schedule | `notification-*-service` + core `*-reminder` / `reminder-policy` |
| Maestro E2E | `apps/mobile/.maestro/` · [`maestro.md`](./maestro.md) |

---

## Фича → файлы

| Фича | Экраны | Services | Domain / API |
|------|--------|----------|--------------|
| **Scanner** | `(tabs)/scanner.tsx` | `scanner-service`, `barcode-lookup-*`, `ocr-api`, `scan-intent-api`, `search-ingredients-api`, dish/photo | `@allerguide/ai` (scan, intent, search); API `scan.ts`, `scan-intent.ts`, `ocr.ts`, `search-ingredients.ts` |
| **Home insights** | `(tabs)/home.tsx` | `home-insights-service`, `wellness-service` | core `home-insights`, `wellness*` |
| **Diary** | `(tabs)/diary.tsx` | `diary-*`, attachments, context | core `diary*` |
| **Profiles** | `profile-setup`, `profile`, `profile-edit` | `profile-*`, conditions, phenotype, contacts | core profile*; API `profiles.ts` |
| **SOS** | `(tabs)/sos.tsx`, `sos-edit.tsx` | `sos-service`, `sos-passport-service`, `emergency-contact-service` | core `allergy-passport`, `emergency-contacts` |
| **Pollen / map** | `(tabs)/map.tsx` | `pollen-map-service`, `pollen-heatmap-service`, `location-service`, `place-service` | core pollen*; API `pollen.ts`; comps `YandexMap`, `GooglePollenMap*` |
| **Auth** | `login`, `register`, forgot/reset | `auth-service`, `backend-api`, `secure-settings` | core `auth`/`password`; API `mobile-auth.ts` |
| **Sync / backup** | cards на profile | `sync-service`, `sync-restore`, `backup-crypto`, `backup-file-service` | core `sync`/`crypto`; API `sync.ts` |
| **Product catalog** | scanner (+ market) | `catalog-api`, `barcode-*`, `open-food-facts-service`, `product-service` | core `catalog`; API `catalog.ts` |
| **Market** | `(tabs)/market.tsx` | `market-api` + `modules/marketplace` | core `market-offers`; API `market.ts` |
| **Clinical** | `asit-course`, `asthma-action-plan`, `insect-action-plan`, `food-drug-registry`, `prescribed-therapy` | соответствующие `*-service` | core `asit-therapy`, `gina-asthma`, `insect-allergy`, … |
| **i18n** | любой экран через `useTranslation()` | `settings-service` (locale) | `src/i18n/*`, `locale-store.ts` |
| **Doctor report** | `doctor-report.tsx` | `doctor-report-service` | core `doctor-report*` |

---

## apps/mobile

Каталог: `apps/mobile/`. Expo 53 · RN 0.79 · Expo Router 5 · Zustand · SQLite / IndexedDB.

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
| `(tabs)/home.tsx` | Dashboard / wellness / home-insights |
| `(tabs)/diary.tsx` | Дневник + clinical cards |
| `(tabs)/scanner.tsx` | Штрихкод / фото / текст / OCR |
| `(tabs)/map.tsx` | Пыление / места |
| `(tabs)/market.tsx` | Safe-product marketplace |
| `(tabs)/sos.tsx` | SOS passport + contacts |
| `onboarding-intro.tsx` / `onboarding.tsx` | Intro + сценарий |
| `profile-setup.tsx` | Мастер профиля |
| `profile.tsx` / `profile-edit.tsx` | Профиль / редактирование |
| `login.tsx` / `register.tsx` | Auth |
| `forgot-password.tsx` / `reset-password.tsx` | Сброс пароля (backend) |
| `sos-edit.tsx` | Редактор SOS |
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
| Diary | `diary-service`, `diary-section-service`, `diary-context-service`, `diary-attachment-service`, `diary-photo-picker` |
| Scanner / catalog | `scanner-service`, `barcode-lookup-service`, `barcode-cache-service`, `catalog-api`, `catalog-cache-service`, `allergen-catalog-service`, `open-food-facts-service`, `product-service`, `safe-products-service`, `scan-history-service`, `scanner-photo-*`, `scanner-dish-*`, `dish-off-enrichment-service`, `ocr-api-service`, `scan-intent-api-service`, `search-ingredients-api-service`, `stt-api-service`, `alias-feedback-service` |
| Home | `home-insights-service`, `wellness-service` |
| SOS / reports | `sos-service`, `sos-passport-service`, `doctor-report-service` |
| Clinical | `asit-*-service`, `asthma-action-plan-service`, `insect-action-plan-service`, `food-drug-registry-service`, `prescribed-therapy*-service`, `clinical-reminder-service`, `reminder-reconcile-service` |
| Pollen / map | `pollen-map-service`, `pollen-heatmap-service`, `pollen-reminder-service`, `location-service`, `place-service`, `wellness-service` |
| Sync / backup | `sync-service`, `sync-restore`, `backup-crypto`, `backup-file-service` |
| Settings / ops | `settings-service`, `secure-settings-service`, `notification-*-service`, `app-lock-service`, `analytics-service`, `error-reporting`, `startup-metrics`, `haptics`, `voice-dictation-service`, `voice-mic-recording-service`, `market-api` |

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

- **Shell:** `Screen`, `ScreenHeader`, `GlassCard`, `Button`, `EmptyState`, `ErrorBoundary`, `AppLockGate`, …
- **Profile/clinical editors:** `AllergenPicker`, `ConditionPicker`, `*Card`, `EmergencyContactsEditor`, …
- **Diary:** `DiaryWizard`, `DiaryEditorModal`, `diary/*`
- **Maps:** `YandexMap`, `PollenMapLayer`, `GooglePollenMap(.web)`
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
| `scan-intent.ts` | OCR intent classify (`YC_SCAN_INTENT_LLM`) |
| `ocr.ts` | Yandex Vision OCR (`YC_OCR_ENABLED`) |
| `search-ingredients.ts` | Yandex Search ingredients (`YC_SEARCH_ENABLED`) + cache |
| `stt.ts` | SpeechKit STT (`YC_STT_ENABLED`) |
| `catalog.ts` | Allergens + products barcode/search (+ OFF) |
| `market.ts` | Yandex Market affiliate |
| `pollen.ts` | Google pollen heatmap proxy |
| `alias-feedback.ts` | Crowdsourced aliases |
| `analytics.ts` | Event ingest |
| `governance.ts` | Policy metadata |
| Health | `GET /api/health` в `app.ts` |

### DB

| Файл | Schema |
|------|--------|
| `db/app-schema.ts` | `profile.*` — users, profiles, diary, scan_history, contacts, sos, sync_backups |
| `db/catalog-schema.ts` | `catalog.*` — allergens, cross_reactions, products, alias_feedback |
| `db/config.ts` + `index.ts` | Neon-ready pools; optional `readDb` |
| `drizzle/0000`…`0008_*.sql` | Versioned migrations — **commit SQL**, apply via `db:migrate` |

Миграции: `pnpm --filter api db:generate` → commit → `db:migrate`. Не `db:push` на реальных данных.

### Middleware / services

- Middleware: `security.ts` (helmet/CORS/rate limit), `require-jwt.ts`
- Services: `open-food-facts`, `llm-scan-provider`, `yandex-vision-ocr`, `yandex-speechkit-stt`, `yandex-search-ingredients`, `google-pollen-heatmap`, `yandex-market-affiliate`, `app-user-service`, `profile-service`, …

---

## packages/*

### `@allerguide/core` — `packages/core/src/`

Barrel: `index.ts`. Pure TS.

| Область | Модули (ориентиры) |
|---------|-------------------|
| Types / allergens | `types`, `allergens`, `allergen-aliases`, `regulatory-allergens`, `catalog`, `barcodes`, `adair-catalog` |
| Profiles | `profile-*`, `allergy-confirmations`, `condition-*`, `clinical-phenotypes`, `clinical-coding` |
| Diary / home | `diary`, `diary-stats`, `diary-severity`, `diary-triggers`, `diary-profile`, `voice-diary`, `home-insights` |
| Scan risk | `scan-risk`, `may-contain-parser`, `scan-trends`, `alias-feedback`, `dish-components` |
| Clinical | `gina-asthma`, `pef-zones`, `asthma-action-plan`, `asit-therapy`, `insect-allergy`, `food-drug-allergy`, `prescribed-therapy`, `clinical-scales` |
| SOS / reports | `emergency-contacts`, `allergy-passport`, `doctor-report*` |
| Pollen / geo | `pollen-*`, `google-pollen-heatmap`, `geo`, `yandex-map` |
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
| `YC_OCR` | `features.ts` (`YC_OCR_ENABLED`) | `YC_OCR_ENABLED` |
| `YC_SCAN_INTENT_LLM` | `features.ts` | `YC_SCAN_INTENT_LLM` |
| `YC_SEARCH` | `features.ts` | `YC_SEARCH_ENABLED` |
| `PRODUCT_DB` | `features.ts` | catalog DB + OFF |
| `POLLEN_HEATMAP=google` | `features.ts` | `POLLEN_HEATMAP_ENABLED` + `GOOGLE_POLLEN_API_KEY` |
| `ANALYTICS_ENABLED` | `analytics-service.ts` | `/api/analytics` |
| `LIVE_MAP` | `place-service.ts` | — |
| `SENTRY_DSN` | `error-reporting.ts` | — |
| `API_URL` | `api-client` и др. | — |

По умолчанию флаги **выключены** (см. `.env.example`).

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
| QA | [`qa-checklist.md`](./qa-checklist.md) |
| Clinical | [`clinical-features-raaci.md`](./clinical-features-raaci.md) |
| YC stage | [`migrate-off-replit-to-yc.md`](./migrate-off-replit-to-yc.md) |
| ADR | [`adr/`](./adr/) |

---

## Команды качества

```bash
pnpm install                 # из корня
pnpm typecheck
pnpm test
pnpm --filter mobile lint
pnpm rc-gate                 # typecheck + lint + test + doc/Maestro
```

Mobile web: `cd apps/mobile && npx expo start --web --port 5000`  
API: `pnpm --filter api dev` (нужны `DATABASE_URL` + `JWT_SECRET`)
