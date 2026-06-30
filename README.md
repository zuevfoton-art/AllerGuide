# AllerGuide Repository

Мобильное приложение для управления аллергией: Expo Router, локальная SQLite (native) / IndexedDB (web), профили, дневник, PDF-отчёт, сканер и локальные напоминания. **Offline-first** — backend опционален и включается feature flags.

## Документация

| Документ | Назначение |
|----------|------------|
| [`docs/architecture.md`](docs/architecture.md) | Архитектура системы |
| [`docs/development-rules.md`](docs/development-rules.md) | **Правила разработки** (обязательно перед кодом) |
| [`docs/functional-requirements.md`](docs/functional-requirements.md) | Функциональные требования |
| [`docs/roadmap-to-prod.md`](docs/roadmap-to-prod.md) | Roadmap к production (Phase 0–5) |
| [`docs/qa-checklist.md`](docs/qa-checklist.md) | Регрессионный чеклист internal alpha |
| [`docs/eas-internal-preview.md`](docs/eas-internal-preview.md) | Первая EAS preview-сборка |
| [`docs/phase-0-run.md`](docs/phase-0-run.md) | Отчёт о выполнении Phase 0 |
| [`AGENTS.md`](AGENTS.md) | Команды, env, инструкции для агентов |

## Стек

- **pnpm** workspaces + **Turborepo**
- Expo + React Native + TypeScript (`apps/mobile`)
- Express + Drizzle + PostgreSQL (`apps/api`, опционально)
- `@allerguide/core` — доменная логика
- `@allerguide/ai` — сканер, OCR, LLM

## Структура monorepo

```
apps/mobile   — основное мобильное приложение
apps/api      — backend (Express + Drizzle), опционально
packages/core — доменная логика
packages/ai   — сканер, OCR, LLM
packages/ui   — общие UI-компоненты
```

## Запуск

```bash
pnpm install
pnpm --filter mobile start
```

Web (порт 5000):

```bash
cd apps/mobile && npx expo start --web --port 5000
```

Опциональный API (требует Postgres + `JWT_SECRET`):

```bash
pnpm --filter api dev   # http://localhost:3001
```

## Проверки

```bash
pnpm typecheck
pnpm test
pnpm --filter mobile lint
```

## Feature flags (mobile)

Скопируйте `.env.example` → `apps/mobile/.env` (или корневой `.env`). По умолчанию все интеграции **выключены** — приложение полностью работает offline.

| Переменная | По умолчанию | Назначение |
|------------|--------------|------------|
| `EXPO_PUBLIC_BACKEND_AUTH` | `false` | JWT-auth через API |
| `EXPO_PUBLIC_CLOUD_SYNC` | `false` | Шифрованный облачный бэкап |
| `EXPO_PUBLIC_AI_SCAN_ENABLED` | `false` | LLM-скан через `/api/scan` |
| `EXPO_PUBLIC_PRODUCT_DB` | `false` | Каталог продуктов API + OFF fallback |
| `EXPO_PUBLIC_SENTRY_DSN` | — | Crash reporting |
| `EXPO_PUBLIC_ANALYTICS_ENABLED` | `false` | Аналитика (screen views) |

Полный список: [`.env.example`](.env.example) · [`AGENTS.md`](AGENTS.md).

## Персистентность

| Платформа | Хранилище |
|-----------|-----------|
| iOS / Android | `expo-sqlite` |
| Web | IndexedDB (`web-store.ts`), async write-through |

## Internal alpha (Phase 0)

1. Прогнать [`docs/qa-checklist.md`](docs/qa-checklist.md) на iOS + Android + web
2. Собрать EAS preview: [`docs/eas-internal-preview.md`](docs/eas-internal-preview.md) или `./scripts/first-preview-build.sh`
3. Убедиться, что `eas init` заменил placeholder `projectId` в `app.json`

## EAS preview-сборка

```bash
./scripts/first-preview-build.sh android   # или ios / all
```

Требуется аккаунт [Expo](https://expo.dev). Backend flags в профиле `preview` выключены (`apps/mobile/eas.json`).
