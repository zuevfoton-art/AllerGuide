# AllerGuide Architecture

Репозиторий организован как monorepo с `apps/mobile`, `apps/api` и shared packages.

## Mobile

Mobile-приложение использует Expo Router tabs. Shared-логика вынесена в `@allerguide/core` (типы, аллергены, onboarding) и `@allerguide/ai` (mock-сканер).

## Data

На native-платформах используется SQLite (`init.native.ts`). На web данные хранятся в **IndexedDB**: in-memory кэш с синхронным API и асинхронной фоновой записью (`src/db/web-store.ts`), с одноразовой миграцией из устаревшего `localStorage`. Это снимает лимит `localStorage` (~5–10 МБ), синхронную блокировку главного потока и O(n)-перезапись всего хранилища на каждом чтении. Таблица `app_settings` хранит сценарий onboarding и флаг завершения.

## Onboarding

Сценарий `both` запускает двухшаговый wizard: профиль «Я» → профиль «Ребёнок». Bootstrap-маршрут определяется через `resolveBootstrapRoute()` из `@allerguide/core`.

## Profiles

CRUD профилей: создание, список, редактирование (`/profile-edit`), удаление с каскадом записей дневника (`/profiles`).

## CI

GitHub Actions: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## API

Backend в `apps/api` — Express + Drizzle ORM + PostgreSQL.

### Разделение БД на схемы (`profile` и `catalog`)

Данные разнесены по двум Postgres-схемам («базам»):

- **`profile`** — всё, что относится к пользователю: `app_users`, `profiles`, `diary_entries`, `scan_history`, `emergency_contacts`, `profile_sos`, `sync_backups`. Определение: `src/db/app-schema.ts` (`profileSchema`).
- **`catalog`** — общие справочники: `allergens`, `cross_reactions`, `products`. Определение: `src/db/catalog-schema.ts` (`catalogSchema`).
- Таблицы Replit-OIDC (`users`, `sessions`) остаются в `public`.

Drizzle-объекты схемо-квалифицированы, поэтому код запросов не меняется. Человекочитаемые автономные определения каждой «базы» лежат в `apps/api/sql/profile.sql` и `apps/api/sql/catalog.sql` (справочные артефакты; живая БД управляется миграциями). Перенос существующих таблиц в схемы выполнен неразрушающей миграцией `drizzle/0003_*` через `ALTER TABLE ... SET SCHEMA`.

### Production hardening

- **Безопасность** (`src/middleware/security.ts`, подключено в `app.ts`): `helmet`, строгий CORS по allowlist (`CORS_ORIGINS`), rate-limiting per-IP (глобальный + усиленный для `/api/auth` и `/api/scan`). Отключается через `RATE_LIMIT_DISABLED=true`.
- **Аутентификация без состояния**: мобильный путь использует stateless JWT (HS256, `src/lib/jwt.ts`), что позволяет горизонтально масштабировать API за балансировщиком. Replit OIDC (сессии в Postgres) остаётся опциональным.
- **Версионированные миграции**: `db:generate` → SQL в `apps/api/drizzle/` (коммитится), `db:migrate` применяет их через `drizzle-orm` migrator. `db:push` — только для одноразовых dev-БД.

### AI-сканер (`src/routes/scan.ts`, `src/lib/scan-cache.ts`)

LLM-запрос обёрнут кэшем результатов (ключ — хэш режима/текста/аллергенов) и дневным бюджетом на пользователя/IP; биллится только промах кэша. Опциональная JWT-аутентификация (`SCAN_REQUIRE_AUTH`). Кэш резко снижает стоимость при росте аудитории.

### Справочники: аллергены и штрихкоды (`src/db/catalog-schema.ts`, `src/routes/catalog.ts`)

Глобальные справочники во внешней БД:

- `allergens` / `cross_reactions` — сид из `@allerguide/core` (`db:seed-allergens`), единый источник правды — статический каталог в core.
- `products` — каталог по штрихкоду (`barcode` PK, `name`, `ingredients`, `allergen_tags`, `source`). Наполняется импортом датасета `db:import-food-allergy` (`apps/api/data/food-allergy/`, источник — [alexf388/Food-Allergy-SQL-Database](https://github.com/alexf388/Food-Allergy-SQL-Database)) и/или write-through кэшем поверх Open Food Facts.
- **Индексация** (миграция `drizzle/0002_*`): `pg_trgm` + GIN по `name` (нечёткий поиск), полнотекст по `ingredients` (`to_tsvector('russian', ...)`), GIN по `allergen_tags` и `keywords`.
- Эндпоинты: `GET /api/allergens` (fallback на статический core-список без БД), `GET /api/products/:barcode`, `GET /api/products/search?q=`. Клиент включается флагом `EXPO_PUBLIC_PRODUCT_DB`.
- **Маппинг словарей**: внешние теги (датасет, OFF `allergens_tags` вида `en:milk`) приводятся к канонической RU-таксономии через `@allerguide/core` (`mapExternalAllergenNames`) — и при импорте, и при write-through. Так сканер матчит товары на профиль пользователя.
- **Write-through кэш OFF**: при промахе `GET /api/products/:barcode` сервер тянет Open Food Facts (`src/services/open-food-facts.ts`), нормализует, маппит теги и сохраняет в `products` (`source='openfoodfacts'`); повторный запрос отдаётся из БД. Управляется `PRODUCT_OFF_FALLBACK`.
- При росте каталога до миллионов SKU поиск выносится в Meilisearch/Typesense/OpenSearch с наполнением из Postgres (Postgres остаётся source of truth).

### Облачная синхронизация (`src/routes/sync.ts`)

Резервные копии сохраняются в таблицу `sync_backups` (in-memory fallback без БД), доступ по мобильному JWT или legacy `SYNC_API_KEY`, владение проверяется по `userId` из токена. Полезная нагрузка хранится непрозрачно: клиент шифрует бэкап на устройстве (AES-GCM, `@allerguide/core`) перед загрузкой — сервер zero-knowledge.

### Neon (serverless Postgres)

Слой БД (`src/db/index.ts`, `src/db/config.ts`) подготовлен под Neon:

- **Pooled vs direct**: рантайм использует `DATABASE_URL` (на Neon — pooled `-pooler` эндпоинт), миграции — `DIRECT_DATABASE_URL` (direct, не через PgBouncer); `migrate.ts`/`drizzle.config.ts` берут direct с fallback на `DATABASE_URL`.
- **Опции подключения из env** (`buildConnectionOptions`): `DB_SSL=require` (TLS обязателен у Neon), `DB_PREPARE=false` (prepared statements несовместимы с transaction-pooling PgBouncer), `DB_POOL_MAX`/`DB_IDLE_TIMEOUT`/`DB_CONNECT_TIMEOUT`/`DB_MAX_LIFETIME`.
- **Read replica**: `READ_DATABASE_URL` включает отдельный read-клиент (`readDb`); чтения каталога (`/api/allergens`, `/api/products/:barcode`, `/api/products/search`) идут в `readDb`, записи — в primary `db`. Без переменной `readDb` прозрачно падает на primary.
- **Branching для preview/CI**: `.github/workflows/neon-preview.yml` создаёт эфемерную ветку БД на каждый PR (миграции+тесты на изолированной копии) и удаляет её при закрытии PR; включается при наличии секрета `NEON_API_KEY`.
- **Cold start / scale-to-zero**: ленивый синглтон переиспользует подключение; на проде отключить scale-to-zero или принять задержку первого запроса.

### Масштабирование до 1M MAU (инфраструктура, вне кода)

Следующие пункты — инфраструктурные и настраиваются при деплое, а не в этом репозитории:

- **Сессии в Redis** вместо Postgres для Replit-OIDC пути (мобильный JWT уже stateless).
- **PgBouncer** (пул соединений) перед Postgres при нескольких инстансах API.
- **Read-реплики** для тяжёлых чтений (`GET /api/sync/backup`).
- **Несколько stateless-инстансов API** за балансировщиком (TLS-терминация; `trust proxy` уже включён).
- **CDN** для статической web-сборки и **rate-limit store в Redis** для согласованных лимитов между инстансами.

### Наблюдаемость

Мобильное приложение пишет аналитику (`src/services/analytics-service.ts`: переходы между экранами + `profile_created`/`scan_completed`) и crash-репорты (Sentry, `src/services/error-reporting.ts`). Включаются через `EXPO_PUBLIC_ANALYTICS_ENABLED` / `EXPO_PUBLIC_SENTRY_DSN`.
