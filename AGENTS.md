# AllerGuide

pnpm + Turborepo monorepo. The product is **AllerGuide**, an Expo / React Native (Web + native) allergy-management app with a Russian-language UI. The user-facing app lives in `apps/mobile` and is offline-first (local SQLite on native, a `localStorage` shim on web; AI scanner is mocked). A standalone, optional Express backend lives in `apps/api`.

See `README.md` for the basic stack/run summary and root `package.json` / per-package `package.json` for the canonical scripts.

## Cursor Cloud specific instructions

- Package manager is **pnpm** (`packageManager: pnpm@10.0.0`). Dependencies are installed by the startup update script (`pnpm install`); you do not need to install them manually. A stray root `package-lock.json` exists but is not used — do not run `npm install`.
- Ignore `AllerGuide-full/` — it is an older duplicate snapshot of the same monorepo. The canonical code is at the repo root (`apps/`, `packages/`).

### Mobile app (the product) — `apps/mobile`
- Run the web app the same way the Replit config does: `cd apps/mobile && npx expo start --web --port 5000 --clear` (serves on `http://localhost:5000`). `pnpm start` from the root runs `expo start` without forcing web/port.
- The app is fully self-contained: no backend, database, or network services are required to run or test it end-to-end. First-run flow is onboarding → create profile → home dashboard, with data persisted locally.
- Expo prints "packages should be updated for best compatibility" version warnings on startup; these are expected and do not block the app.
- `pnpm typecheck` currently FAILS on `apps/mobile` due to pre-existing code issues (missing `@expo/vector-icons` type declaration, and a type error in `app/(tabs)/sos.tsx`). `@expo/vector-icons` still resolves at runtime via Metro (it ships transitively with `expo`), so the app runs despite the typecheck errors. Do not treat these as setup breakage.
- `pnpm lint` is a no-op (`echo lint`) for all packages; there is no real linter configured.

### Backend API (optional) — `apps/api`
- Not wired to the mobile app; only needed if testing backend endpoints directly. Run with `pnpm --filter api dev` (port 3001).
- It will NOT boot without a live PostgreSQL (`DATABASE_URL`) plus Replit OIDC env vars (`SESSION_SECRET`, `REPL_ID`, optional `ISSUER_URL`). Schema is applied via `pnpm --filter api db:push`. Leave this out of scope unless explicitly required.
