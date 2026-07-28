# Archived Replit deploy runbook (Phase 3 — migrate-off-replit-to-yc).
#
# **Do not use for staging.** Canonical stage API is Yandex Cloud:
#   docs/staging-yandex-cloud.md · api.staging.aclearo.com
#
# Historical reference for the former aller-guide.replit.app Autoscale + Expo export path.
# Replit OIDC in apps/api remains opt-in behind `REPL_ID` (unset on YC).

# Публикация через Replit

Replit поддерживает два сценария для AllerGuide:

| Сценарий | Что публикуется | Где настраивается |
|----------|-----------------|-------------------|
| **Replit Deploy (web)** | PWA (Expo export) + API (autoscale) | `.replit` → `[deployment]` |
| **EAS Build (native)** | APK / TestFlight (iOS/Android) | `apps/mobile` + Expo cloud |

---

## 1. Web-публикация (Replit Deploy)

Настроено в [`.replit`](../.replit):

```toml
[deployment]
deploymentTarget = "autoscale"
ignoreDatabaseMigrations = true
build = ["bash", "scripts/replit-deploy-build.sh"]
run = ["bash", "-c", "cd apps/api && npx tsx src/index.ts"]
```

API раздаёт собранный фронтенд из `apps/mobile/dist` (см. `apps/api/src/app.ts`).

Скрипт [`scripts/replit-deploy-build.sh`](../scripts/replit-deploy-build.sh):

1. `source scripts/replit-db-env.sh` — Neon/Helium TLS и direct URL для миграций
2. `pnpm install`
3. `pnpm --filter api db:migrate` — если задан `DATABASE_URL` (production при деплое)
4. `expo export` → `apps/mobile/dist`

### Ошибка «Invalid Neon production database found for repl …»

**Важно:** сообщение говорит «Neon», но ошибка **не обязательно** означает, что в Secrets лежит старый `neon.tech`. Development на Helium (`@helium/heliumdb`) с автоматическими PG-переменными — **нормальная конфигурация**. Ошибка возникает на этапе **Republish**, когда Replit проверяет **production-базу опубликованного деплоя** — это отдельная сущность от dev-БД в Database panel.

**Типичные причины (при корректных Secrets):**

- **Битая или устаревшая привязка production DB** у уже опубликованного Repl (часто после fork/remix или миграции Replit dev → Helium).
- **Production DB на паузе** — Replit не может сравнить схему (`Failed to check for database diff`).
- **Несовпадение dev и production** в метаданных Publishing (dev уже Helium, а production-запись ещё ссылается на удалённый Neon endpoint).

**Что сделано в репозитории:**

- Убран модуль `postgresql-16` из `.replit` — используется только managed Postgres из панели **Database**.
- [`scripts/replit-db-env.sh`](../scripts/replit-db-env.sh) — для Helium (`sslmode=disable`) выставляет `DB_SSL=disable`; для Neon/pooler — `require` и `DIRECT_DATABASE_URL`.
- `ignoreDatabaseMigrations = true` — схема обновляется Drizzle в `build`, не автоматическим push dev→prod.

**Шаги в Replit UI (если Secrets уже чистые):**

1. **Database** → **Development** → **Unpause database** (если кнопка есть).
2. **Database** → **Production** → **Unpause database** — именно production часто «спит» и ломает Republish, хотя dev работает.
3. **Publish / Republish** → **Production database**:
   - Включите **Create production database** (пересоздаёт привязку production у деплоя).
   - При необходимости — **Set up your production database with your current development data**.
4. Завершите публикацию. Replit подставит новый production `DATABASE_URL` в secrets **деплоя** (не в `[userenv]`).
5. На следующих Republish **не** включайте «Create production database» — только Republish; миграции применит `replit-deploy-build.sh`.

**Проверка только если подозреваете ручной override** (у вас может не понадобиться):

- В Secrets нет ручного `DATABASE_URL` / `NEON_DATABASE_URL`, который переопределяет Database panel.
- В `[userenv]` нет PG-переменных — только флаги приложения (`EXPO_PUBLIC_*`, `JWT_SECRET`).

Если после Unpause + пересоздания production ошибка повторяется — [Replit Support](https://replit.com/support) с **Repl ID** из сообщения об ошибке (это сбой на стороне платформы, не в коде приложения).

См. также: [Fix a published app using a shared database](https://docs.replit.com/references/data-and-storage/shared-database-migration).

### Replit Helium (текущая БД)

Replit выдаёт внутренний URL вида:

```text
postgresql://postgres:password@helium/heliumdb?sslmode=disable
```

- **Development** и **Production** используют одинаковый формат; Replit подставляет разные credentials через Secrets / Database panel — **не дублируйте** `DATABASE_URL` вручную в `[userenv]`.
- `sslmode=disable` — нормально для Helium внутри сети Replit; скрипт [`replit-db-env.sh`](../scripts/replit-db-env.sh) выставляет `DB_SSL=disable`, **не** `require`.
- Отдельный `DIRECT_DATABASE_URL` для Helium **не нужен** (нет `-pooler`).
- Проверка в Shell: `pnpm --filter api db:migrate` (после `source scripts/replit-db-env.sh`).

### Ошибка «Cannot push development database objects, production database already exists»

**Причина:** при повторной публикации Replit пытается снова скопировать схему/данные из **development** БД в **production**, хотя production уже создана.

**Исправление в репозитории:** `ignoreDatabaseMigrations = true` — Replit не делает автоматический push dev→prod; схема обновляется нашими Drizzle-миграциями в `build`.

**В UI Publishing при Republish (после успешного пересоздания production):**

- **Не включайте** «Create production database», если production уже работает.
- Достаточно **Republish** — миграции применятся на этапе `build`.

**Исключение:** при ошибке «Invalid Neon production database» нужно **один раз** снова включить Create production database (см. выше).

### Шаги

1. В Replit: **Deploy** → **Autoscale** (или Republish)
2. Дождитесь сборки (`pnpm install` + миграции + `expo export`)
3. Откройте URL деплоя — фронтенд и API на одном домене

### Ограничения web-версии

- Нет камеры / штрихкодов (ручной ввод)
- Нет push-уведомлений
- IndexedDB вместо SQLite

---

## 2. Native-сборка (EAS) из Replit Shell

Если нужен APK/TestFlight, запускайте EAS из Shell Replit:

```bash
cd apps/mobile
corepack enable
pnpm exec eas login
pnpm exec eas init
pnpm build:preview:android
```

### Ошибка `pnpm add pnpm@10.34.4` exit code 1

**Причина:** EAS пытался установить pinned pnpm в корне monorepo командой `pnpm add` без `-w` — pnpm 10 отказывает.

**Исправлено в репозитории:**

- Убран `"pnpm": "10.34.4"` из `eas.json` (версия берётся из `packageManager` в корневом `package.json`)
- Добавлен [`.npmrc`](../.npmrc) с `node-linker=hoisted`
- Добавлен `eas-build-pre-install` → `corepack enable` перед install на серверах EAS

После `git pull` перезапустите сборку.

---

## 3. Backend API на Replit

API (`apps/api`) можно держать на Replit с PostgreSQL. Мобильное приложение по умолчанию **не требует** backend (offline-first).

Для staging позже:

```bash
pnpm --filter api dev
```

См. [`AGENTS.md`](../AGENTS.md) и [`.env.example`](../.env.example).

---

## Связанные документы

- [`docs/eas-internal-preview.md`](./eas-internal-preview.md) — native preview APK/TestFlight
- [`docs/qa-checklist.md`](./qa-checklist.md) — регрессия после установки
