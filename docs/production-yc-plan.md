# Production Yandex Cloud plan (P3.7)

Plan only — this document does **not** provision prod. Staging stays the single live API (`api.staging.aclearo.com`) until an owner creates a separate folder / billing account.

## What must not be copied

Staging scripts hard-code staging IDs as defaults. Pointing them at prod without new IDs would overwrite staging.

| Script | Staging default | Prod requirement |
|--------|-----------------|------------------|
| `scripts/yc-lockbox-deploy-secrets.sh` | `YC_LOCKBOX_SECRET_ID=e6qs399v1b3unstfh5rj` | New Lockbox secret; no default fallback to staging |
| same | `YC_CONTAINER_ID` required (helpers default `bba700s2t35i2khgmiit`) | New Serverless Container |
| same | `YC_RUNTIME_SA_ID=aje6ao4g8osp10tjlnd5` | New runtime SA |
| same | `YC_NETWORK_ID=enp9qi529uf3bvu15078` | New VPC / subnet |
| `apps/api/lockbox-staging.keys` | Staging key list | `lockbox-production.keys` (same names, different values) |
| EAS `staging` | `https://api.staging.aclearo.com` | EAS `production` already points at `https://api.aclearo.com` |

**Rule:** prod scripts take `YC_*` from the environment with **no staging default**, or they refuse to run when `YC_ENV=production` and a staging ID is detected.

## Duplicate for prod

1. **Folder / billing** — separate from staging so a lockbox upsert cannot hit the wrong secret.
2. **Managed PostgreSQL** — own cluster, own `DATABASE_URL` / `DIRECT_DATABASE_URL`. Do not reuse the staging database.
3. **Lockbox** — own secret id; mount the same key names (`JWT_SECRET`, `DATABASE_URL`, pollen / Places / AQ / YC AI).
4. **Serverless Container** — image `aclearo-api:production` (not `:staging`).
5. **Domain** — `api.aclearo.com` (+ optional `.ru`). TLS at the API gateway / certificate manager.
6. **EAS production** — already has `EXPO_PUBLIC_API_URL=https://api.aclearo.com`. Fill real `ascAppId` / `appleTeamId` (still placeholders).
7. **Monitoring** — YC logging + alerting on `/api/health` (`ok`, `database.ok`, `features.*`). Sentry DSN for production (separate project from staging).
8. **Backups** — Managed PG automated backups + a documented restore drill. Backup retention must match the privacy deletion SLA.

## Parameterization sketch (do this before first prod deploy)

```bash
# required, no staging fallback
: "${YC_ENV:?set YC_ENV=production}"
: "${YC_LOCKBOX_SECRET_ID:?}"
: "${YC_CONTAINER_ID:?}"
: "${YC_REGISTRY_ID:?}"
: "${YC_RUNTIME_SA_ID:?}"
: "${YC_NETWORK_ID:?}"
IMAGE_TAG=production
```

Add a guard in `yc-lockbox-deploy-secrets.sh`:

- if `YC_ENV=production` and `YC_LOCKBOX_SECRET_ID` equals the staging id → exit 2
- if `IMAGE_TAG=staging` while `YC_ENV=production` → exit 2

Do not run `pnpm yc-stage-phase*` against prod. Those gates encode staging URLs and pollen smoke coordinates.

## Out of scope until traffic exists

- PgBouncer / read replica (P5.6)
- Distributed scan-cache
- Multi-region

## Owner actions (not done here)

- Create the prod folder, PG, Lockbox, container, DNS
- Issue production JWT and Google/YC keys (never reuse staging keys)
- Replace `ascAppId` / `appleTeamId` in `apps/mobile/eas.json`
- Confirm Replit Postgres (if any) has no residual user data after the 2026-08-17 pause
