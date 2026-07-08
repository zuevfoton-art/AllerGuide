# AllerGuide

pnpm + Turborepo monorepo. The product is **AllerGuide**, an Expo / React Native (Web + native) allergy-management app with a Russian-language UI. The user-facing app lives in `apps/mobile` and is offline-first (local SQLite on native, IndexedDB on web). A standalone, optional Express backend lives in `apps/api`.

See `README.md` for the basic stack/run summary and root `package.json` / per-package `package.json` for the canonical scripts.

---

## Architecture-first development (mandatory)

**Before writing or changing code**, read and follow:

1. [`docs/architecture.md`](docs/architecture.md) — system design, layers, data flows, feature flags
2. [`docs/development-rules.md`](docs/development-rules.md) — where to put code, anti-patterns, PR checklist, **TypeScript standards (§10)**

Task context: [`docs/functional-requirements.md`](docs/functional-requirements.md) (what) · [`docs/roadmap-to-prod.md`](docs/roadmap-to-prod.md) (when/phase).

### TypeScript & code style (summary)

See [`development-rules.md` §10](docs/development-rules.md#10-typescript-и-стандарты-кода): plan before coding, strong typing, Zod for new API schemas, Conventional Commits, JSDoc on exported APIs. Shortcuts: `CURSOR:PAIR`, `RFC`, `RFP`.

### Non-negotiable rules (summary)

| Rule | Detail |
|------|--------|
| **Offline-first** | Core flows work without API; network is optional enrichment |
| **Thin adapters** | Domain logic in `packages/core` / `packages/ai`; mobile screens and API routes orchestrate only |
| **No DB/API in screens** | `app/**/*.tsx` → `src/services/*` → `db` / `core` / optional backend |
| **Feature flags** | Backend integration behind `EXPO_PUBLIC_*` (default off in `.env.example`) |
| **i18n** | `useTranslation()` + all 6 locales + `types.ts`; not legacy i18next |
| **Migrations** | `db:generate` + commit SQL + `db:migrate`; never `db:push` on real data |
| **TypeScript** | No `any`; plan before code; Conventional Commits; see §10 in development-rules |

Full checklist: [`docs/development-rules.md` §8](docs/development-rules.md#8-чеклист-перед-merge).

---

## Cursor Cloud specific instructions

- Package manager is **pnpm** (`packageManager: pnpm@10.34.4`). Run `pnpm install` from the repo root before typecheck/tests.
- Ignore `AllerGuide-full/` if present — it was an older duplicate snapshot. The canonical code is at the repo root (`apps/`, `packages/`).

### Mobile app (the product) — `apps/mobile`
- Run the web app: `cd apps/mobile && npx expo start --web --port 5000` (serves on `http://localhost:5000`). `pnpm start` from the root runs `expo start` without forcing web/port.
- Gotcha: a **cold** `--clear` start can transiently fail to resolve workspace packages (`Unable to resolve "@allerguide/core" ...`) and exit. Prefer starting **without** `--clear`; if a cold start fails, just re-run (the warm Metro cache resolves fine).
- The app is fully self-contained for local dev: no backend or network services are required for core flows. Web persistence uses IndexedDB via an in-memory cache with async write-through (`src/db/web-store.ts`), with a one-time migration from any legacy `localStorage` data; native uses `expo-sqlite`.
- Expo may print package version compatibility warnings on startup; these are expected and do not block the app.

### Quality checks
- `pnpm typecheck` — TypeScript across all packages
- `pnpm test` — Vitest in `packages/core`, `packages/ai`, `apps/mobile`, and `apps/api`
- `pnpm --filter mobile lint` — ESLint for the mobile app
- `pnpm rc-gate` — Phase 2 RC gate (typecheck + lint + test + doc/Maestro checks); see [`docs/rc-gate.md`](docs/rc-gate.md)

### Backend API (optional) — `apps/api`
- Not wired to the mobile app by default. Run with `pnpm --filter api dev` (port 3001). Requires PostgreSQL (`DATABASE_URL`) + `JWT_SECRET` to boot the auth/sync/scan features.
- To exercise the API or migrations locally you need a Postgres instance (it is NOT part of the update script). Provision one, set `DATABASE_URL`, and migrate.
- Migrations: the versioned path is `pnpm --filter api db:generate` (writes SQL to `apps/api/drizzle/`, commit it) then `pnpm --filter api db:migrate` (applies via `drizzle-orm` migrator). `db:push` still exists for throwaway dev DBs — do not use it on a DB with real data. Custom SQL (extensions like `pg_trgm`, GIN indexes) is hand-appended to the generated migration files.
- Catalog data: `pnpm --filter api db:seed-allergens` loads the allergen taxonomy from `@allerguide/core`; `pnpm --filter api db:import-food-allergy` imports the bundled dataset (`apps/api/data/food-allergy/`) into the `products` table. Endpoints: `GET /api/allergens` (falls back to the static core list when no DB), `GET /api/products/:barcode`, `GET /api/products/search?q=`. Mobile uses them when `EXPO_PUBLIC_PRODUCT_DB=true` (backend-first barcode lookup, Open Food Facts fallback).
- External allergen vocabularies (dataset tags, OFF `en:milk` tags) are mapped to the canonical RU taxonomy via `@allerguide/core` `mapExternalAllergenNames` (both at import and at OFF write-through).
- Open Food Facts integration (`src/services/open-food-facts.ts`): on-demand `fetchOpenFoodFactsProduct(barcode)` (enriched: brand, image, ingredients, allergens+traces) and `searchOpenFoodFacts(query)` (full-text). OFF requires a `User-Agent` (`OPENFOODFACTS_USER_AGENT`). `/api/products/:barcode` and `/api/products/search?q=` query OFF on demand and cache into `catalog.products` when there's no local hit (`PRODUCT_OFF_FALLBACK=true`, default on).
- DB connection (Neon-ready, `src/db/config.ts` + `index.ts`): runtime uses `DATABASE_URL` (Neon pooled `-pooler` endpoint), migrations use `DIRECT_DATABASE_URL` (direct, fallback to `DATABASE_URL`). Env-driven options: `DB_SSL` (`require`/`disable`), `DB_PREPARE=false` (for PgBouncer transaction pooling), `DB_POOL_MAX`/`DB_IDLE_TIMEOUT`/`DB_CONNECT_TIMEOUT`/`DB_MAX_LIFETIME`. Optional read replica via `READ_DATABASE_URL` exposes `readDb` (catalog reads route there; writes use primary `db`; falls back to primary when unset). Per-PR Neon DB branches run in `.github/workflows/neon-preview.yml` when `NEON_API_KEY` is configured.
- DB layout: data is split into two Postgres schemas — `profile` (per-user: `app_users`, `profiles`, `diary_entries`, `scan_history`, `emergency_contacts`, `profile_sos`, `sync_backups`) and `catalog` (global: `allergens`, `cross_reactions`, `products`). Replit-OIDC `users`/`sessions` stay in `public`. Drizzle table objects are schema-qualified (`profileSchema`/`catalogSchema` in `db/app-schema.ts` / `db/catalog-schema.ts`), so query code is unchanged. Human-readable standalone definitions live in `apps/api/sql/{profile,catalog}.sql` (reference artifacts; the live DB is managed by migrations).
- Production hardening lives in `app.ts` + `src/middleware/security.ts`: helmet, strict CORS (`CORS_ORIGINS` allowlist), and per-IP rate limits. Set `RATE_LIMIT_DISABLED=true` to turn limits off (tests already do this where needed).
- AI scan (`src/routes/scan.ts` + `src/lib/scan-cache.ts`): in-memory result cache + per-identity daily budget + optional `SCAN_REQUIRE_AUTH`. Enable with `AI_SCAN_ENABLED=true` + `OPENAI_API_KEY`; mobile flag `EXPO_PUBLIC_AI_SCAN_ENABLED=true`.
- Cloud sync (`src/routes/sync.ts`): disabled by default (`SYNC_ENABLED=false`). When enabled it persists to the `sync_backups` table (in-memory fallback when no DB), authenticates via mobile JWT or the legacy `SYNC_API_KEY`, and stores payloads opaquely. The mobile client encrypts backups client-side (`@allerguide/core` `encryptString`, AES-GCM) before upload — the server is zero-knowledge. Enable on mobile with `EXPO_PUBLIC_CLOUD_SYNC=true`. NOTE: the backup key is currently device-held, so cross-device restore needs key escrow / a password-derived key (follow-up).
- Mobile backend auth: set `JWT_SECRET` + `DATABASE_URL` on API, migrate, then enable `EXPO_PUBLIC_BACKEND_AUTH=true` on mobile.
- Observability: `EXPO_PUBLIC_ANALYTICS_ENABLED=true` logs analytics events (screen views + `profile_created`/`scan_completed`) to console/HTTP; `EXPO_PUBLIC_SENTRY_DSN` enables crash reporting. Both off by default.

### Production builds (internal alpha)
- Local Android build (Node.js + Gradle) and Android Studio verification: see [`docs/android-local-build.md`](docs/android-local-build.md). Quick path from `apps/mobile`: `pnpm android` (= `expo run:android`) or `cd android && ./gradlew assembleDebug` → `app/build/outputs/apk/debug/app-debug.apk`. The native `apps/mobile/android/` project is committed (Gradle 8.13, Hermes, JDK 17).
- EAS preview: see [`docs/eas-internal-preview.md`](docs/eas-internal-preview.md). Run `pnpm --filter mobile build:preview:android` (or `:ios`) after `eas init`.
- Replit deploy (web): see [`docs/replit-deploy.md`](docs/replit-deploy.md). `.replit` uses `ignoreDatabaseMigrations = true`, `scripts/replit-db-env.sh`, and `scripts/replit-deploy-build.sh`. «Invalid Neon production database» is usually a stale **deployment production DB** binding on Replit's side (not dev Secrets); see replit-deploy.md.
- QA regression: [`docs/qa-checklist.md`](docs/qa-checklist.md).
- Store config: `apps/mobile/app.json`, EAS profiles in `apps/mobile/eas.json`.
- Regenerate icons: `pnpm --filter mobile generate-assets`.
- Replace placeholder `extra.eas.projectId` with your EAS project before building.
