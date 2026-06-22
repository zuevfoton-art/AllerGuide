# Публикация через Replit

Replit поддерживает два сценария для AllerGuide:

| Сценарий | Что публикуется | Где настраивается |
|----------|-----------------|-------------------|
| **Replit Deploy (web)** | Статический PWA (Expo web export) | `.replit` → `[deployment]` |
| **EAS Build (native)** | APK / TestFlight (iOS/Android) | `apps/mobile` + Expo cloud |

---

## 1. Web-публикация (Replit Deploy)

Уже настроено в [`.replit`](../.replit):

```toml
[deployment]
deploymentTarget = "static"
build = ["bash", "-c", "corepack enable && pnpm install && cd apps/mobile && pnpm exec expo export --platform web --output-dir ../../dist"]
publicDir = "dist"
```

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
