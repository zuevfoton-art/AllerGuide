# Публикация через Replit

Replit поддерживает два сценария для AllerGuide:

| Сценарий | Что публикуется | Где настраивается |
|----------|-----------------|-------------------|
| **Replit Deploy (web)** | Статический PWA (Expo web export) | `.replit` → `[deployment]` |
| **EAS Build (native)** | APK / TestFlight (iOS/Android) | `apps/mobile` + Expo cloud |

---

## 1. Web-публикация (Replit Deploy)

Настроено в [`.replit`](../.replit):

```toml
[deployment]
deploymentTarget = "static"
ignoreDatabaseMigrations = true
build = ["bash", "scripts/replit-deploy-build.sh"]
publicDir = "apps/mobile/dist"
```

Скрипт [`scripts/replit-deploy-build.sh`](../scripts/replit-deploy-build.sh):

1. `pnpm install`
2. `pnpm --filter api db:migrate` — если задан `DATABASE_URL` (production при деплое)
3. `expo export` → `apps/mobile/dist`

### Ошибка «Cannot push development database objects, production database already exists»

**Причина:** при повторной публикации Replit пытается снова скопировать схему/данные из **development** БД в **production**, хотя production уже создана.

**Исправление в репозитории:** `ignoreDatabaseMigrations = true` — Replit не делает автоматический push dev→prod; схема обновляется нашими Drizzle-миграциями в `build`.

**В UI Publishing при Republish:**

- **Не включайте** «Create production database» / «Set up production database with development data», если production уже есть.
- Достаточно **Republish** — миграции применятся на этапе `build`.

### Шаги

1. В Replit: **Deploy** → **Static**
2. Дождитесь сборки (`pnpm install` + `expo export`)
3. Откройте URL деплоя

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
