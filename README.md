# AllerGuide Repository

Мобильное приложение для управления аллергией: Expo Router tabs, локальная SQLite-база (native) / IndexedDB (web), профили, дневник, PDF-отчёт, сканер и камера для штрихкодов. **Offline-first** — backend опционален.

## Документация

| Документ | Назначение |
|----------|------------|
| [`docs/architecture.md`](docs/architecture.md) | Архитектура системы |
| [`docs/development-rules.md`](docs/development-rules.md) | **Правила разработки** (обязательно перед кодом) |
| [`docs/codebase-index.md`](docs/codebase-index.md) | Навигационный индекс: экраны, сервисы, «куда менять X» |
| [`docs/functional-requirements.md`](docs/functional-requirements.md) | Функциональные требования |
| [`docs/roadmap-to-prod.md`](docs/roadmap-to-prod.md) | Roadmap к production |
| [`docs/git-bash-roadmap.md`](docs/git-bash-roadmap.md) | Git Bash: milestones, issues, ветки, PR |
| [`docs/android-local-build.md`](docs/android-local-build.md) | Локальная сборка Android (Node.js + Gradle) и проверка в Android Studio |
| [`docs/eas-internal-preview.md`](docs/eas-internal-preview.md) | Облачная сборка (EAS) для internal alpha |
| [`AGENTS.md`](AGENTS.md) | Команды, env, инструкции для агентов |

## Стек

- Expo + React Native + TypeScript
- Expo Router tabs через каталог `(tabs)`
- expo-sqlite (native) / IndexedDB (web)
- expo-print для PDF-отчётов
- expo-camera для сканирования штрихкодов
- pnpm workspaces + Turborepo

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

Web: `cd apps/mobile && npx expo start --web --port 5000`

### Локальная Android-сборка (release)

Команды Expo нужно запускать из **`apps/mobile`** (или через скрипты из корня). Из корня репозитория `npx expo run:android` падает с `Unable to resolve module ../../App`, потому что у корневого `package.json` нет `main: "expo-router/entry"`.

```bash
# из корня (рекомендуется)
pnpm android-release

# или вручную
cd apps/mobile
pnpm android-release
```

На Windows не используйте двоеточие в имени скрипта (`android:release`) — cmd.exe воспринимает его как путь на диске. Если скрипт не найден, запустите напрямую:

```bash
cd apps/mobile
pnpm exec expo run:android --variant release
```

Используйте **pnpm**, не `npx`/`npm`: в `.npmrc` настроен `node-linker=hoisted` для pnpm.

## Проверки

```bash
pnpm typecheck
pnpm test
pnpm lint
```

## GitHub publish

```bash
git init
git branch -M main
git remote add origin https://github.com/<account>/AllerGuide.git
git add .
git commit -m "feat: AllerGuide initial prototype"
git push -u origin main
```
