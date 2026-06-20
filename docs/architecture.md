# AllerGuide Architecture

Репозиторий организован как monorepo с `apps/mobile`, `apps/api` и shared packages.

## Mobile

Mobile-приложение использует Expo Router tabs. Shared-логика вынесена в `@allerguide/core` (типы, аллергены, onboarding) и `@allerguide/ai` (mock-сканер).

## Data

На native-платформах используется SQLite (`init.native.ts`). На web — localStorage-адаптер (`init.ts`). Таблица `app_settings` хранит сценарий onboarding и флаг завершения.

## Onboarding

Сценарий `both` запускает двухшаговый wizard: профиль «Я» → профиль «Ребёнок». Bootstrap-маршрут определяется через `resolveBootstrapRoute()` из `@allerguide/core`.

## Profiles

CRUD профилей: создание, список, редактирование (`/profile-edit`), удаление с каскадом записей дневника (`/profiles`).

## CI

GitHub Actions: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## API

Backend в `apps/api` — Express + Drizzle ORM + PostgreSQL.
