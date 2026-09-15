# GlitchTip on staging — self-hosted crash ingest (P2.3 / G5)

Plan only for **owner provisioning**. This document does **not** create a VM, DNS, or Lockbox entries. Do not point ingest at sentry.io. Do not put GlitchTip on the AllerGuide Managed Postgres cluster ([`postgresql.tf`](../infra/yandex/staging/postgresql.tf)) — that database holds profiles and diary data.

**Compose:** [`infra/yandex/staging/glitchtip/docker-compose.yml`](../infra/yandex/staging/glitchtip/docker-compose.yml)

**Client:** `@sentry/react-native` in [`apps/mobile/src/services/error-reporting.ts`](../apps/mobile/src/services/error-reporting.ts) (Sentry envelope protocol). Session health is **off**; G5 crash-free is first-party analytics (`session_started` / `app_crashed`). See [`analytics-staging.md`](./analytics-staging.md) and [`rc-gate.md`](./rc-gate.md).

## Why a separate VM

| Constraint | Reason |
|------------|--------|
| Public HTTPS | The mobile SDK posts envelopes from devices; ingest cannot stay private-only |
| Own Postgres volume | Crash payloads (stacks, breadcrumbs) must not sit next to `profile.*` |
| Not the API Serverless Container | GlitchTip is stateful (uploads, worker); API stays stateless |

Suggested hostname: `https://errors.staging.aclearo.com` (+ optional `.ru` CNAME).

## Minimum VM

- Yandex Compute, Container Optimized Image or Ubuntu, **2 vCPU / 4 GB**, staging VPC
- Security group: 443 from the internet (ingest + UI); SSH/22 only from admin CIDR
- Disk: 30 GB+ (events + uploads). Retention: `GLITCHTIP_MAX_EVENT_LIFE_DAYS=90`
- TLS: Certificate Manager + HTTPS reverse proxy (Caddy/nginx) in front of container port 8000

## Compose layout

Services in the bundled file:

1. `postgres:16` — GlitchTip-only database (named volume). **Not** the app MDB cluster.
2. `valkey` — queue/cache (optional to drop; then set `VALKEY_URL=` empty so GlitchTip uses Postgres)
3. `glitchtip` — `glitchtip/glitchtip:v6.0.10` all-in-one (`./bin/run-all-in-one.sh`)

Copy env, then start:

```bash
cd infra/yandex/staging/glitchtip
cp .env.example .env
# set SECRET_KEY, POSTGRES_PASSWORD, GLITCHTIP_DOMAIN
docker compose up -d
```

First boot:

1. Open `https://errors.staging.aclearo.com` and create the **single** admin user.
2. Set `ENABLE_USER_REGISTRATION=false` in `.env` and recreate the GlitchTip container.
3. Create organization + React Native project. Copy the DSN (`https://<key>@errors.staging.aclearo.com/<id>`).
4. Confirm the DSN host is **not** `sentry.io`.

## Secrets (do not reuse API Lockbox)

Keep GlitchTip secrets on the VM (or a **separate** Lockbox secret, e.g. `aclearo-staging-glitchtip`). Never mount them into `apps/api`. Never put GlitchTip on the AllerGuide Managed Postgres cluster.

Optional: a dedicated MDB database named `glitchtip` with its own user, instead of compose Postgres — still a separate cluster/database from `profile` / `catalog`.

| Name | Where |
|------|--------|
| `SECRET_KEY` (`GLITCHTIP_SECRET_KEY` in Lockbox) | Django signing key (`openssl rand -hex 32`) |
| `POSTGRES_PASSWORD` / DB URL | Compose Postgres only, or the dedicated `glitchtip` MDB user |
| SMTP (`EMAIL_URL`) | Optional alerts; console mail is fine for soak |

EAS (client DSN is public-by-design in the APK):

```bash
cd apps/mobile
pnpm exec eas env:create --environment staging --name EXPO_PUBLIC_ERROR_DSN --value "$GLITCHTIP_DSN" --visibility sensitive
# optional alias if something still reads the old name:
pnpm exec eas env:create --environment staging --name EXPO_PUBLIC_SENTRY_DSN --value "$GLITCHTIP_DSN" --visibility sensitive
```

Do **not** set `SENTRY_AUTH_TOKEN` for sentry.io. Native/JS source maps: Expo's artifact-bundle upload talks to Sentry Cloud APIs that GlitchTip does not implement. For soak, JS stacks without maps are acceptable; native symbols via `glitchtip-cli debug-files upload` if needed later. `SENTRY_URL` + `SENTRY_ORG` + `SENTRY_PROJECT` enable the Expo plugin **only** when `SENTRY_URL` is this GlitchTip origin (sentry.io is rejected in [`error-tracker-url.js`](../apps/mobile/error-tracker-url.js)).

Then rebuild:

```bash
pnpm --filter mobile build:staging:android
```

## Verify before soak

1. Staging APK with `EXPO_PUBLIC_ERROR_DSN` set and `EXPO_PUBLIC_ANALYTICS_ENABLED=true` (already on the EAS `staging` profile).
2. Force `captureMessage` / a debug crash → issue appears in GlitchTip (native backstop).
3. Cold start → `session_started` on `GET /api/analytics/dashboard` (`crashFree.sessionClients ≥ 1`).
4. ErrorBoundary crash → `app_crashed` with `fatal: true`; `crashFree.rate` updates.

Native crashes after JS is dead may miss `app_crashed`. Count GlitchTip issues in the same 14-day window as a backstop in the [soak log](./staging-soak-log.md).

## Privacy

- No session replay (GlitchTip does not record the screen).
- `error-reporting.ts` scrubs tokens, passwords, user/profile ids from extras.
- Analytics `app_crashed` sends **only** `fatal` (plus transport `client_id` / `platform` / `app_version`) — no message, no stack.
- 90-day event retention; state the period in the privacy policy (P3.3 / P3.4).

## Production

Duplicate in a **prod** folder/VM (`errors.aclearo.com`), new secret, new DSN. Do not reuse the staging database or `SECRET_KEY`. See [`production-yc-plan.md`](./production-yc-plan.md).
