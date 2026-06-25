# AllerGuide Repository

Мобильное приложение для управления аллергией: Expo Router tabs, локальная SQLite-база (native) / IndexedDB (web), профили, дневник, PDF-отчёт, сканер и камера для штрихкодов. **Offline-first** — backend опционален.

## Документация

| Документ | Назначение |
|----------|------------|
| [`docs/architecture.md`](docs/architecture.md) | Архитектура системы |
| [`docs/development-rules.md`](docs/development-rules.md) | **Правила разработки** (обязательно перед кодом) |
| [`docs/functional-requirements.md`](docs/functional-requirements.md) | Функциональные требования |
| [`docs/roadmap-to-prod.md`](docs/roadmap-to-prod.md) | Roadmap к production |
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
