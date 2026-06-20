# AllerGuide Architecture

Репозиторий организован как monorepo с `apps/mobile`, `apps/api` и shared packages.

## Mobile

Mobile-приложение использует Expo Router tabs. Директория `(tabs)` в структуре `app/` интерпретируется Expo Router как layout для вкладок.

## Data

На native-платформах используется SQLite (`init.native.ts`, `openDatabaseSync`). На web — localStorage-адаптер (`init.ts`) с тем же интерфейсом сервисов.

## PDF

PDF-отчёт создаётся через `Print.printToFileAsync`, который сохраняет файл в cache directory приложения, после чего файл можно расшарить пользователю.

## CI

GitHub Actions запускает `pnpm typecheck` и `pnpm lint` на каждый push и pull request в `main`.

## API

Backend в `apps/api` — Express + Drizzle ORM + PostgreSQL, с интеграцией Replit Auth.
