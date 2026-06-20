# AllerGuide

pnpm + Turborepo monorepo. The product is **AllerGuide**, an Expo / React Native (Web + native) allergy-management app with a Russian-language UI. The user-facing app lives in `apps/mobile` and is offline-first (local SQLite on native, a `localStorage` shim on web). A standalone, optional Express backend lives in `apps/api`.

See `README.md` for the basic stack/run summary and root `package.json` / per-package `package.json` for the canonical scripts.

## Cursor Cloud specific instructions

- Package manager is **pnpm** (`packageManager: pnpm@10.34.4`). Run `pnpm install` from the repo root before typecheck/tests.
- Ignore `AllerGuide-full/` if present — it was an older duplicate snapshot. The canonical code is at the repo root (`apps/`, `packages/`).

### Mobile app (the product) — `apps/mobile`
- Run the web app: `cd apps/mobile && npx expo start --web --port 5000 --clear` (serves on `http://localhost:5000`). `pnpm start` from the root runs `expo start` without forcing web/port.
- The app is fully self-contained for local dev: no backend or network services are required for core flows. Data persists locally (SQLite on native, `localStorage` on web).
- Expo may print package version compatibility warnings on startup; these are expected and do not block the app.

### Quality checks
- `pnpm typecheck` — TypeScript across all packages
- `pnpm test` — Vitest unit tests in `packages/core` and `packages/ai`
- `pnpm --filter mobile lint` — ESLint for the mobile app

### Backend API (optional) — `apps/api`
- Not wired to the mobile app by default. Run with `pnpm --filter api dev` (port 3001).
- Requires PostgreSQL (`DATABASE_URL`) and session/OIDC env vars for full boot. Schema via `pnpm --filter api db:push`.
