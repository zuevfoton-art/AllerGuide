# GlitchTip on staging — self-hosted crash ingest (P2.3 / G5)

Terraform in [`infra/yandex/staging/glitchtip.tf`](../infra/yandex/staging/glitchtip.tf) matches the live folder. There is **no remote Terraform state** in this repo (S3 backend is commented out in [`versions.tf`](../infra/yandex/staging/versions.tf)), so the staging VM was created with `yc` against folder `b1glkbb9i8ufp6bsdn4u` instead of a full `terraform apply` (that would try to recreate VPC/MDB/API). Import the resources below into the owner state before the next apply.

Do **not** point ingest at sentry.io. Do **not** put GlitchTip on the AllerGuide Managed Postgres cluster ([`postgresql.tf`](../infra/yandex/staging/postgresql.tf)). Do **not** mount this Lockbox into the API Serverless Container.

**Compose:** [`infra/yandex/staging/glitchtip/docker-compose.yml`](../infra/yandex/staging/glitchtip/docker-compose.yml) — publishes `127.0.0.1:8000` only. Caddy on the VM terminates TLS on :443.

**Client:** `@sentry/react-native` in [`apps/mobile/src/services/error-reporting.ts`](../apps/mobile/src/services/error-reporting.ts). Session health is **off**; G5 crash-free is first-party analytics (`session_started` / `app_crashed`). See [`analytics-staging.md`](./analytics-staging.md) and [`rc-gate.md`](./rc-gate.md).

Public hostname: `https://errors.staging.aclearo.com`

## Live staging (folder `b1glkbb9i8ufp6bsdn4u`)

| Resource | Id / value |
|----------|------------|
| VM `aclearo-staging-glitchtip` | `fhmpenjqltp5ee82ek9r` RUNNING, Ubuntu 22.04, 2/4/30, `ru-central1-a` |
| NAT IPv4 | `158.160.58.56` (private `10.128.0.34`, subnet `default-ru-central1-a`) |
| Instance SA | `ajeh5pcrgsuq6fe1hq81` (`aclearo-staging-glitchtip`) |
| Lockbox | `e6qrn93qngpnhviaog11` (`aclearo-staging-glitchtip`, `deletion_protection`) |
| Security group | `enpt4cblcdr873501otf` (`aclearo-staging-glitchtip-sg`) — :80/:443 in, no :22 |
| Compose | `glitchtip/glitchtip:6.2.6` + `postgres:16` + `valkey:8` on a VM volume |

Lockbox already has `SECRET_KEY` / `POSTGRES_PASSWORD` / `GLITCHTIP_ADMIN_PASSWORD`. `ENABLE_USER_REGISTRATION` must stay **`false`**. First admin is `glitchtip-bootstrap-admin.service` (`createsuperuser` + org `aclearo-staging` + RN project `mobile`), not the public signup form. DSN is echoed to serial as `ACLARO_DSN=`.

Import into the owner Terraform state (same root as the API):

```bash
cd infra/yandex/staging
terraform import yandex_iam_service_account.glitchtip ajeh5pcrgsuq6fe1hq81
terraform import yandex_lockbox_secret.glitchtip e6qrn93qngpnhviaog11
terraform import 'yandex_lockbox_secret_iam_member.glitchtip_payload' \
  'e6qrn93qngpnhviaog11,lockbox.payloadViewer,serviceAccount:ajeh5pcrgsuq6fe1hq81'
terraform import yandex_vpc_security_group.glitchtip enpt4cblcdr873501otf
terraform import yandex_compute_instance.glitchtip fhmpenjqltp5ee82ek9r
```

Optional SSH later: set `glitchtip_ssh_public_key` and `glitchtip_ssh_cidrs` (never `0.0.0.0/0`) in `terraform.tfvars` and apply **only after import**. Default is **no port 22**.

## Who does what

| Step | Who |
|------|-----|
| Terraform + cloud-init + Caddy + compose bind + this runbook | git / PR |
| `terraform apply` / `yc` against the live folder | **Owner only** — Cloud Agent must not apply |
| Live VM + Lockbox payload (this folder) | **Done** (`yc`, bootstrap SA) |
| DNS A at **reg.ru** (`ns1.reg.ru` / `ns2.reg.ru`) | **Owner** — not in this YC folder |
| First GlitchTip admin via `createsuperuser` on the VM, DSN | **Automated** (`glitchtip-bootstrap-admin.service` → serial `ACLARO_DSN=`) |
| EAS Sensitive `EXPO_PUBLIC_ERROR_DSN` + staging APK rebuild | `eas.json` `staging.env` (public in APK) + EAS preview Sensitive when `EXPO_TOKEN` is available |
| `terraform import` into owner state | **Owner** (before the next apply) |
| 14-day soak | Product, after smoke below |

## Apply checklist (owner)

Cloud Agent **does not** `terraform apply` this root from empty local state (that recreates VPC/MDB/API). Live GlitchTip user-data / serial DSN kick is allowed. `eas env:create` needs `EXPO_TOKEN`.

### Greenfield (empty folder / empty Terraform state only)

```bash
./scripts/yc-staging-bootstrap.sh plan   # must list yandex_compute_instance.glitchtip
./scripts/yc-staging-bootstrap.sh apply  # owner
```

Then: Lockbox payload → DNS A → TLS → admin unit (`ACLARO_DSN` on serial) → EAS / `eas.json` DSN → rebuild APK → smoke (sections 2–6).

### This live folder (API already exists)

Do **not** `apply` against empty local state — that recreates VPC/MDB/API. Import the five resources above, then `terraform plan` (no destroy of API/runner/MDB).

## 1. Terraform apply (only after import)

Do **not** run `./scripts/yc-staging-bootstrap.sh apply` against an empty local state — it would try to create a second VPC/MDB/API stack.

After import, `terraform plan` should show no destroy of the API/runner/MDB.

## 2. Lockbox payload (separate secret)

Secret name: `aclearo-staging-glitchtip`. Live id: `e6qrn93qngpnhviaog11`.

Payload **already exists**. `yc-glitchtip-lockbox-init.sh` keeps `SECRET_KEY` / `POSTGRES_PASSWORD` unless you override them in the environment.

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
| `ENABLE_USER_REGISTRATION` | Must stay **`false`**. First admin is `bootstrap-admin.sh`, not the public form |
| `EMAIL_URL` | Optional; default `consolemail://` |
| `DEFAULT_FROM_EMAIL` | Optional; default `support@aclearo.com` |
| `GLITCHTIP_ADMIN_PASSWORD` | Django superuser password for `bootstrap-admin.sh` (never print) |
| `GLITCHTIP_ADMIN_EMAIL` | Optional; default `support@aclearo.com` |

The VM systemd unit `glitchtip-bootstrap.service` retries Lockbox until `SECRET_KEY` / `POSTGRES_PASSWORD` exist, then `docker compose up -d`. `glitchtip-bootstrap-admin.service` then creates the first admin + RN project and writes `/opt/glitchtip/dsn.txt`.

## 3. DNS + TLS

TLS is **Caddy + Let's Encrypt HTTP-01** on the VM (not Certificate Manager — CM certs are awkward on Compute).

`aclearo.com` NS is **reg.ru** (`ns1.reg.ru` / `ns2.reg.ru`), not a public zone in this YC folder.

```
A  errors.staging.aclearo.com  →  158.160.58.56
```

Optional later: CNAME `errors.staging.aclearo.ru` and `glitchtip_fqdn_ru` in tfvars — only after the name exists, or ACME can fail the whole Caddy site.

Wait until `curl -sI https://errors.staging.aclearo.com` is 200/302. Host must not be `sentry.io`.

If the VM booted **before** the A record existed, Caddy's first Let's Encrypt attempt fails. The unit `glitchtip-acme-retry.timer` reloads Caddy every 2 minutes until HTTPS works. Caddyfile keeps HTTP-01 on `:80` (`http://` site; `/.well-known/acme-challenge/*` is not redirected). To kick a live VM without waiting: serial console `sudo systemctl reload caddy`.

Port **8000** from the NAT IP must not answer (compose is loopback-only).

## 4. First admin (not public signup)

Public registration defaults to **off**. Do not open the UI to create the first user — GlitchTip can still allow a first-registrant takeover if the user table is empty.

`glitchtip-bootstrap-admin.service` reads `GLITCHTIP_ADMIN_PASSWORD` from Lockbox, runs [`bootstrap-admin.py`](../infra/yandex/staging/glitchtip/bootstrap-admin.py) (`createsuperuser` + org `aclearo-staging` + team `aclearo` + project `mobile` / `javascript-react-native`), and writes the DSN. Serial console has no login; scrape the marker instead of opening SSH `0.0.0.0/0`:

```bash
yc compute instance get-serial-port-output --id fhmpenjqltp5ee82ek9r --port 1 \
  | tr -d '\r' | grep '^ACLARO_DSN='
# host must be errors.staging.aclearo.com, never sentry.io
```

To flip the flag later without rotating DB secrets:

```bash
ENABLE_USER_REGISTRATION=false YC_GLITCHTIP_LOCKBOX_SECRET_ID=e6qrn93qngpnhviaog11 ./scripts/yc-glitchtip-lockbox-init.sh
sudo systemctl restart glitchtip-bootstrap.service glitchtip-bootstrap-admin.service
```

## 5. EAS DSN + staging APK

DSN is public in the APK by design (Sensitive, not Secret). Profile `staging` in [`eas.json`](../apps/mobile/eas.json) reads EAS environment **`preview`** and also sets `EXPO_PUBLIC_ERROR_DSN` in `build.staging.env` so a build without dashboard Sensitive still sends envelopes to this host.

```bash
GLITCHTIP_DSN="$(yc compute instance get-serial-port-output --id fhmpenjqltp5ee82ek9r --port 1 \
  | tr -d '\r' | awk -F= '/^ACLARO_DSN=/{print $2}' | tail -n 1)"
cd apps/mobile
pnpm exec eas env:create --environment preview --name EXPO_PUBLIC_ERROR_DSN --value "$GLITCHTIP_DSN" --visibility sensitive
# optional alias:
pnpm exec eas env:create --environment preview --name EXPO_PUBLIC_SENTRY_DSN --value "$GLITCHTIP_DSN" --visibility sensitive
pnpm --filter mobile build:staging:android
```

Tag `eas-staging-*` runs [`.github/workflows/eas-staging-android.yml`](../.github/workflows/eas-staging-android.yml) when `workflow_dispatch` is unavailable. Tag `android-staging-*` runs the Gradle APK job; [`scripts/resolve-staging-error-dsn.sh`](../scripts/resolve-staging-error-dsn.sh) prefers a GitHub secret, then `eas.json` `staging.env`, then EAS `env:get`.

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
3. `glitchtip/glitchtip:6.2.6` all-in-one, `127.0.0.1:8000`

Retention: `GLITCHTIP_MAX_EVENT_LIFE_DAYS=90`.

## Privacy

- No session replay.
- `error-reporting.ts` scrubs tokens, passwords, user/profile ids.
- Analytics `app_crashed` sends **only** `fatal` plus transport meta.
- 90-day event retention — state in the privacy policy (P3.3 / P3.4).

## Production

Out of this checklist. Duplicate in a **prod** folder/VM (`errors.aclearo.com`), new Lockbox, new DSN. See [`production-yc-plan.md`](./production-yc-plan.md).
