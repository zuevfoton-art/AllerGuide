# GlitchTip on staging — self-hosted crash ingest (P2.3 / G5)

Terraform in [`infra/yandex/staging/glitchtip.tf`](../infra/yandex/staging/glitchtip.tf) defines the VM, dedicated security group, instance SA, and Lockbox **placeholder**. This document is the **owner apply checklist**. Cloud agents do **not** run `terraform apply` or `yc` write against the live folder.

Do **not** point ingest at sentry.io. Do **not** put GlitchTip on the AllerGuide Managed Postgres cluster ([`postgresql.tf`](../infra/yandex/staging/postgresql.tf)). Do **not** mount this Lockbox into the API Serverless Container.

**Compose:** [`infra/yandex/staging/glitchtip/docker-compose.yml`](../infra/yandex/staging/glitchtip/docker-compose.yml) — publishes `127.0.0.1:8000` only. Caddy on the VM terminates TLS on :443.

**Client:** `@sentry/react-native` in [`apps/mobile/src/services/error-reporting.ts`](../apps/mobile/src/services/error-reporting.ts). Session health is **off**; G5 crash-free is first-party analytics (`session_started` / `app_crashed`). See [`analytics-staging.md`](./analytics-staging.md) and [`rc-gate.md`](./rc-gate.md).

Public hostname: `https://errors.staging.aclearo.com`

## Who does what

| Step | Who |
|------|-----|
| Terraform + cloud-init + Caddy + compose bind + this runbook | git / PR |
| `terraform apply`, DNS A, Lockbox payload | **Owner** (folder `admin`) |
| First GlitchTip admin, disable registration, copy DSN | **Owner** |
| EAS `EXPO_PUBLIC_ERROR_DSN` + staging APK rebuild | **Owner** (`EXPO_TOKEN`) |
| 14-day soak | Product, after smoke below |

## 1. Terraform apply

Same root as the API ([`infra/yandex/staging/`](../infra/yandex/staging/)):

```bash
./scripts/yc-staging-bootstrap.sh plan    # expect compute instance aclearo-staging-glitchtip
./scripts/yc-staging-bootstrap.sh apply   # owner only
cd infra/yandex/staging
terraform output -raw glitchtip_public_ip
terraform output -raw glitchtip_lockbox_secret_id
```

Optional SSH: set `glitchtip_ssh_public_key` and `glitchtip_ssh_cidrs` (never `0.0.0.0/0`) in `terraform.tfvars`. Default is **no port 22**.

## 2. Lockbox payload (separate secret)

Secret name: `aclearo-staging-glitchtip`. Id: `terraform output -raw glitchtip_lockbox_secret_id`.

**Never** `./scripts/yc-lockbox-upsert.sh` — that defaults to the API secret.

```bash
YC_GLITCHTIP_LOCKBOX_SECRET_ID="$(cd infra/yandex/staging && terraform output -raw glitchtip_lockbox_secret_id)"
./scripts/yc-glitchtip-lockbox-init.sh
```

Keys (hex only for `POSTGRES_PASSWORD` so `DATABASE_URL` stays valid):

| Key | Purpose |
|-----|---------|
| `SECRET_KEY` | Django signing key |
| `POSTGRES_PASSWORD` | Compose Postgres on the VM disk |
| `ENABLE_USER_REGISTRATION` | `true` until the first admin exists, then `false` |
| `EMAIL_URL` | Optional; default `consolemail://` |
| `DEFAULT_FROM_EMAIL` | Optional; default `support@aclearo.com` |

The VM systemd unit `glitchtip-bootstrap.service` retries Lockbox until those keys exist, then `docker compose up -d`.

## 3. DNS + TLS

TLS is **Caddy + Let's Encrypt HTTP-01** on the VM (not Certificate Manager — CM certs are awkward on Compute).

In Yandex Cloud DNS (`aclearo.com`):

```
A  errors.staging.aclearo.com  →  (glitchtip_public_ip)
```

Optional later: CNAME `errors.staging.aclearo.ru` and `glitchtip_fqdn_ru` in tfvars — only after the name exists, or ACME can fail the whole Caddy site.

Wait until `curl -sI https://errors.staging.aclearo.com` is 200/302. Host must not be `sentry.io`.

Port **8000** from the NAT IP must not answer (compose is loopback-only).

## 4. First admin

1. Open `https://errors.staging.aclearo.com` and create the **single** admin.
2. Create organization + React Native project. Copy the DSN (`https://<key>@errors.staging.aclearo.com/<id>`). Confirm the host is **not** `sentry.io`.
3. Disable public signup:

```bash
ENABLE_USER_REGISTRATION=false YC_GLITCHTIP_LOCKBOX_SECRET_ID=... ./scripts/yc-glitchtip-lockbox-init.sh
# on the VM (SSH or serial console):
sudo systemctl restart glitchtip-bootstrap.service
```

## 5. EAS DSN + staging APK

DSN is public in the APK by design (Sensitive, not Secret).

```bash
cd apps/mobile
pnpm exec eas env:create --environment staging --name EXPO_PUBLIC_ERROR_DSN --value "$GLITCHTIP_DSN" --visibility sensitive
# optional alias:
pnpm exec eas env:create --environment staging --name EXPO_PUBLIC_SENTRY_DSN --value "$GLITCHTIP_DSN" --visibility sensitive
pnpm --filter mobile build:staging:android
```

Do **not** set `SENTRY_AUTH_TOKEN` for sentry.io. Maps upload only if `SENTRY_URL` is this origin ([`error-tracker-url.js`](../apps/mobile/error-tracker-url.js)).

## 6. Smoke before soak

1. Staging APK with `EXPO_PUBLIC_ERROR_DSN` and `EXPO_PUBLIC_ANALYTICS_ENABLED=true`.
2. `captureMessage` / debug crash → issue in GlitchTip UI.
3. Cold start → `session_started` on `GET /api/analytics/dashboard` (`crashFree.sessionClients ≥ 1`).
4. ErrorBoundary → `app_crashed` with `fatal: true`.

Native crashes that kill JS may miss `app_crashed`. Count GlitchTip issues in the [soak log](./staging-soak-log.md).

`pnpm yc-stage-phase0` does **not** hard-fail if GlitchTip is down (API health stays the gate).

## Compose layout

1. `postgres:16` — named volume on the VM. **Not** app MDB.
2. `valkey` — queue/cache
3. `glitchtip/glitchtip:v6.0.10` all-in-one, `127.0.0.1:8000`

Retention: `GLITCHTIP_MAX_EVENT_LIFE_DAYS=90`.

## Privacy

- No session replay.
- `error-reporting.ts` scrubs tokens, passwords, user/profile ids.
- Analytics `app_crashed` sends **only** `fatal` plus transport meta.
- 90-day event retention — state in the privacy policy (P3.3 / P3.4).

## Production

Out of this checklist. Duplicate in a **prod** folder/VM (`errors.aclearo.com`), new Lockbox, new DSN. See [`production-yc-plan.md`](./production-yc-plan.md).
