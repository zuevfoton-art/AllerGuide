# AllerGuide Repository

Мобильное приложение для управления аллергией: Expo Router tabs, локальная SQLite-база (и web-fallback через localStorage), профили, дневник, PDF-отчёт, mock AI-сканер и камера для штрихкодов.

## Стек

- Expo + React Native + TypeScript
- Expo Router tabs через каталог `(tabs)`
- expo-sqlite (native) / localStorage (web)
- expo-print для PDF-отчётов
- expo-camera для сканирования штрихкодов
- pnpm workspaces + Turborepo

## Структура monorepo

```
apps/mobile   — основное мобильное приложение
apps/api      — backend (Express + Drizzle)
packages/*    — shared-модули (@allerguide/core, ai, ui)
```

## Запуск

```bash
pnpm install
pnpm --filter mobile start
```

## Проверки

```bash
pnpm typecheck
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
