# Staging API deploy (Phase 1 — P1.1)

Runbook для развёртывания `apps/api` на staging: Neon Postgres, хостинг, DNS, CI smoke.

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

## P1.1a — Neon staging Postgres + secrets

### 1. Создать проект в Neon

1. [console.neon.tech](https://console.neon.tech) → New Project → имя `allerguide-staging`
2. Region: ближайший к хостингу API (EU/US)
3. Скопировать **pooled** connection string (`-pooler` в hostname) → `DATABASE_URL`
4. Скопировать **direct** connection string (без `-pooler`) → `DIRECT_DATABASE_URL`

### 2. Обязательные переменные

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | Pooled Neon URL |
| `DIRECT_DATABASE_URL` | Direct Neon URL |
| `DB_SSL` | `require` |
| `DB_PREPARE` | `false` |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `SESSION_SECRET` | `openssl rand -hex 32` |

### 3. Проверка миграций локально

```bash
# Экспортируйте URL из Neon (не коммитьте в git)
export DATABASE_URL='postgresql://...-pooler...'
export DIRECT_DATABASE_URL='postgresql://...direct...'
export DB_SSL=require
export DB_PREPARE=false

pnpm install
pnpm --filter api db:migrate
```

Или скрипт-обёртка:

```bash
./scripts/staging-migrate.sh
```

### 4. GitHub Secrets (репозиторий)

| Secret | Назначение |
|--------|------------|
| `STAGING_DATABASE_URL` | Pooled URL |
| `STAGING_DIRECT_DATABASE_URL` | Direct URL |
| `STAGING_JWT_SECRET` | JWT для mobile auth |
| `STAGING_API_URL` | `https://api.staging.allerguide.app` (после P1.1c) |
| `STAGING_OPENAI_API_KEY` | Опционально для локального smoke; на хостинге — в env провайдера |
| `NEON_API_KEY` | Уже для PR preview (опционально тот же project) |
| `NEON_PROJECT_ID` | Variable для neon-preview workflow |

**Не храните секреты в коде** — только в hosting dashboard / GitHub Secrets.

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

Workflow [`.github/workflows/deploy-staging.yml`](../.github/workflows/deploy-staging.yml):

- **Trigger:** `workflow_dispatch` или push в ветку `staging`
- **Шаги:** migrate против `STAGING_*` secrets → smoke `STAGING_API_URL/api/health`

Деплой на хостинг остаётся в build hook провайдера (push `main`/`staging` → auto deploy). Workflow в CI гарантирует миграции и post-deploy smoke.

---

## Чеклист P1.1

- [ ] Neon project `allerguide-staging` создан
- [ ] `DATABASE_URL` + `DIRECT_DATABASE_URL` в secrets хостинга
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
| Health 503, `database.ok: false` | Проверьте `DATABASE_URL`, `DB_SSL=require`, Neon IP allowlist |
| Health 200 но `authDatabase: false` | Задайте `JWT_SECRET` |
| CORS в браузере | Добавьте origin в `CORS_ORIGINS` |
| `prepare` statement errors | `DB_PREPARE=false` на pooled Neon |
