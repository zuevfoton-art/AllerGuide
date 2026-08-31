# Staging API deploy (Phase 1 — P1.1)

Runbook для развёртывания `apps/api` на staging: **Yandex Cloud** Managed Postgres, Serverless Container, DNS, CI smoke.

**Обзорный план инфраструктуры:** [`staging-infrastructure-plan.md`](./staging-infrastructure-plan.md)  
**Yandex Cloud (РФ, private Postgres):** [`staging-yandex-cloud.md`](./staging-yandex-cloud.md) · **консоль по полям:** [`staging-yandex-cloud-console.md`](./staging-yandex-cloud-console.md)  
**Связанные задачи:** P1.1a–e · [`roadmap-to-prod.md`](./roadmap-to-prod.md) · [`apps/api/.env.staging.example`](../apps/api/.env.staging.example)

---

## Целевой URL

```text
https://api.staging.allerguide.app/api/health
```

Ожидаемый ответ (200):

```json
{
  "ok": true,
  "authDatabase": true,
  "features": { "sync": true, "aiScan": true },
  "database": { "ok": true, "latencyMs": 42 }
}
```

---

## P1.1a — Yandex Cloud Managed Postgres + secrets

### 1. Кластер

Staging Postgres — **Yandex Cloud Managed PostgreSQL**, private VPC, без public IP. Определение: [`infra/yandex/staging/postgresql.tf`](../infra/yandex/staging/postgresql.tf). Канонический runbook: [`staging-yandex-cloud.md`](./staging-yandex-cloud.md).

Строка подключения (Odyssey, порт **6432**) уходит в Lockbox как `DATABASE_URL` / `DIRECT_DATABASE_URL`. На YC это один и тот же хост.

### 2. Обязательные переменные

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | YC Managed Postgres URL (`sslmode=require`, обычно `:6432`) |
| `DIRECT_DATABASE_URL` | Тот же URL (или прямой `:5432`, если выделен) |
| `DB_SSL` | `require` |
| `DB_PREPARE` | `false` (пулер Odyssey) |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `SESSION_SECRET` | `openssl rand -hex 32` |

### 3. Проверка миграций локально

Нужен доступ в VPC (или `yc compute ssh` на runner). Не коммитьте URL в git.

```bash
export DATABASE_URL='postgresql://USER:PASSWORD@c-xxxxx.rw.mdb.yandexcloud.net:6432/allerguide?sslmode=require'
export DIRECT_DATABASE_URL="$DATABASE_URL"
export DB_SSL=require
export DB_PREPARE=false

pnpm install
pnpm --filter api db:migrate
```

Или скрипт-обёртка:

```bash
./scripts/staging-migrate.sh
```

### 4. Секреты

Каноническое хранилище — **Yandex Lockbox** (`aclearo-staging-api-env`), не GitHub для `DATABASE_URL`. См. [`staging-secrets-inventory.md`](./staging-secrets-inventory.md).

| Secret | Назначение |
|--------|------------|
| `STAGING_API_URL` | `https://api.staging.aclearo.com` (smoke в CI) |
| `YC_SA_JSON` / `YC_CONTAINER_ID` / `YC_REGISTRY_ID` | deploy-staging.yml |

**Не храните секреты в коде.**

---

## P1.1b — Deploy API на хостинг

Подходит любой Node-хостинг с build hook: **Railway**, **Render**, **Fly.io**.

### Build / start (monorepo root)

```bash
pnpm install --frozen-lockfile
pnpm --filter api db:migrate
pnpm --filter api start
```

`db:migrate` использует `DIRECT_DATABASE_URL` ([`migrate.ts`](../apps/api/src/db/migrate.ts)). Runtime — pooled `DATABASE_URL`.

### Минимальный env на хостинге

Скопируйте из [`apps/api/.env.staging.example`](../apps/api/.env.staging.example):

- `SYNC_ENABLED=true`
- `CORS_ORIGINS` — origins web-клиента (если есть)
- `AI_SCAN_ENABLED=true` + `OPENAI_API_KEY` (P1.5a — required for scan smoke)

**Не задавайте** `METRO_URL` на API-only staging (иначе API проксирует на Metro).

### Render (пример)

- Root Directory: `/` (repo root)
- Build Command: `pnpm install && pnpm --filter api db:migrate`
- Start Command: `pnpm --filter api start`
- Health Check Path: `/api/health`

### Railway (пример)

- Root: repository root
- Custom start: `pnpm --filter api start`
- Pre-deploy: `pnpm --filter api db:migrate`

---

## P1.1c — DNS + TLS

1. В DNS панели домена `allerguide.app`:
   - `api.staging` → CNAME на хостинг (или A-запись)
2. Включить TLS на хостинге (Let's Encrypt) или Cloudflare proxy
3. Smoke:

```bash
./scripts/staging-smoke.sh
# или
curl -sf https://api.staging.allerguide.app/api/health | jq .
```

4. Зафиксировать URL в EAS staging profile (`EXPO_PUBLIC_API_URL`) — [`docs/eas-staging-build.md`](./eas-staging-build.md) (P1.2b)

---

## P1.1d — Seed (опционально)

```bash
pnpm --filter api db:seed-allergens
# pnpm --filter api db:import-food-allergy  # если нужен каталог на staging
```

---

## P1.1e — CI/CD

Канонический workflow: [`.github/workflows/deploy-staging.yml`](../.github/workflows/deploy-staging.yml) — **Deploy staging (Yandex Cloud)**.

- **Trigger:** `workflow_dispatch` или push в ветку `staging`
- **Шаги:** build/push YCR → Serverless Container + Lockbox → migrate (VPC runner) → `staging-preflight.sh` → optional EAS mobile

Подробности: [`staging-yandex-cloud.md`](./staging-yandex-cloud.md) §7.

---

## Чеклист P1.1

- [ ] YC Managed PostgreSQL staging создан (`postgresql.tf`)
- [ ] `DATABASE_URL` + `DIRECT_DATABASE_URL` в Lockbox
- [ ] `pnpm --filter api db:migrate` успешен
- [ ] API отвечает на `/api/health` (200, `database.ok: true`)
- [ ] `./scripts/staging-auth-smoke.sh` — register/login/me (P1.2c)
- [ ] `./scripts/staging-sync-smoke.sh` — encrypted backup round-trip (P1.4b)
- [ ] `./scripts/staging-scan-smoke.sh` — AI scan JWT + cache hit (P1.5b)
- [ ] `./scripts/staging-preflight.sh` — all smokes before closed beta (P1.7)
- [ ] TLS валидный на `api.staging.allerguide.app`
- [ ] `SYNC_ENABLED=true`, `AI_SCAN_ENABLED=true`, `OPENAI_API_KEY` задан
- [ ] `.env.staging.example` и этот runbook в репозитории

---

## Troubleshooting

| Проблема | Решение |
|----------|---------|
| Migrate fails on pooled URL | Используйте `DIRECT_DATABASE_URL` |
| Health 503, `database.ok: false` | Проверьте `DATABASE_URL`, `DB_SSL=require`, сеть VPC |
| Health 200 но `authDatabase: false` | Задайте `JWT_SECRET` |
| CORS в браузере | Добавьте origin в `CORS_ORIGINS` |
| `prepare` statement errors | `DB_PREPARE=false` на пулере (YC `:6432`) |
