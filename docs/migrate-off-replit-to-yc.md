# Миграция stage: Replit → Yandex Cloud

**Цель:** единственный staging backend — Yandex Cloud (`api.staging.aclearo.com` / `.ru`).  
Replit (`aller-guide.replit.app`) — legacy до фаз 3–5; stage-клиенты на него не опираются.

**Каноничный deploy runbook:** [`staging-yandex-cloud.md`](./staging-yandex-cloud.md) · console: [`staging-yandex-cloud-console.md`](./staging-yandex-cloud-console.md)  
**EAS mobile:** [`eas-staging-build.md`](./eas-staging-build.md) · profile `staging` в `apps/mobile/eas.json`

---

## Фазы

| Фаза | Суть | Артефакт |
|------|------|----------|
| **0** | Зафиксировать критерий «Replit не нужен для stage» | Этот документ §Phase 0 + `scripts/yc-stage-phase0-gate.sh` |
| 1 | Lockbox / pollen / полный env на YC API | [`staging-yandex-cloud.md`](./staging-yandex-cloud.md) §3 |
| 2 | Клиенты только на YC URL | EAS `staging`, web stage origins |
| 3 | Вырезать Replit из репо (profile, docs, OIDC) | PR cleanup |
| 4 | Данные/секреты только Lockbox + ротация | inventory + `yc-stage-phase4` |
| 5 | Приёмка: Replit paused, gates зелёные | `yc-stage-phase5` |

---

## Phase 0 — критерий готовности (без Replit)

Stage считается **готовым к отказу от Replit**, когда все пункты ниже выполнены.  
Автопроверка: `./scripts/yc-stage-phase0-gate.sh` (или `pnpm yc-stage-phase0`).

### P0 критерии

| ID | Проверка | Ожидание |
|----|----------|----------|
| **P0.1** | `GET https://api.staging.aclearo.com/api/health` | HTTP 200, `ok: true`, `authDatabase: true`, `database.ok: true` |
| **P0.2** | Зеркало RU (рекомендуется) | То же на `https://api.staging.aclearo.ru/api/health` |
| **P0.3** | Feature flags на API | `features.sync: true`, `features.aiScan: true` |
| **P0.4** | Pollen heatmap (если EAS `staging` → `EXPO_PUBLIC_POLLEN_HEATMAP=google`) | `features.pollenHeatmap: true` + Lockbox `POLLEN_HEATMAP_ENABLED` / `GOOGLE_POLLEN_API_KEY` |
| **P0.5** | EAS profile **`staging`** | `EXPO_PUBLIC_API_URL` = `https://api.staging.aclearo.com` (не `*.replit.app`) |
| **P0.6** | Stage automation | `scripts/staging-*.sh` defaults и staging workflows **не** указывают на `*.replit.app` |
| **P0.7** | API smokes (опционально в gate) | `STAGING_RUN_SMOKES=1` → `staging-preflight.sh` |

### Что Phase 0 **не** требует

- Удаления EAS profile `replit` / `.replit` / Replit OIDC (это **фаза 3**).
- Pause/Unpublish Replit deployment (**фаза 5**).
- Offline-only profile `preview` — остаётся без backend.

### Запуск gate

```bash
# Обязательные live + static checks
./scripts/yc-stage-phase0-gate.sh

# + auth/sync/scan preflight
STAGING_RUN_SMOKES=1 ./scripts/yc-stage-phase0-gate.sh

# Пропустить RU-зеркало (если DNS ещё не готов)
SKIP_RU_MIRROR=1 ./scripts/yc-stage-phase0-gate.sh

# Временно не требовать pollenHeatmap (только пока Lockbox не заполнен)
ALLOW_MISSING_POLLEN_HEATMAP=1 ./scripts/yc-stage-phase0-gate.sh
```

Exit code `0` = Phase 0 критерии выполнены; иначе — список failed checks в stderr.

### Текущий снимок Phase 0 gate

Прогон `./scripts/yc-stage-phase0-gate.sh` против YC:

| ID | Статус | Комментарий |
|----|--------|-------------|
| P0.1 / P0.2 | ✅ | `api.staging.aclearo.com` и `.ru` — `ok`, DB, auth |
| P0.3 | ✅ | `sync` + `aiScan` (Yandex provider) |
| P0.4 | ✅ | `features.pollenHeatmap: true` (Lockbox + image `phase1-418801c`) |
| P0.5 | ✅ | EAS `staging` → `https://api.staging.aclearo.com` |
| P0.6 | ✅ | staging scripts/workflows без `replit.app` |
| — | ✅ | EAS profile `replit` removed (Phase 3) |

Пока pollen не в Lockbox: `ALLOW_MISSING_POLLEN_HEATMAP=1 pnpm yc-stage-phase0` (временный обход для остальных checks).

### Связь с P1.7 preflight

`staging-preflight.sh` — функциональные smokes перед closed beta.  
Phase 0 gate — **инфраструктурный** критерий «YC = единственный stage URL».  
Оба должны быть зелёными перед раздачей EAS `staging` как «официального» stage.

---

## Статус «что уже поднято на YC» (inventory)

Проверено **2026-07-28** из CI/agent VM: live HTTP/DNS/TLS + auth smoke.  
`terraform output` / `yc` CLI в этой среде **недоступны** (нет local state и `yc` binary) — IDs ресурсов сверяйте локально:

```bash
cd infra/yandex/staging
terraform output
# sensitive:
terraform output -raw database_url   # не печатать в чат/PR
terraform output lockbox_secret_id container_registry_id serverless_container_id api_gateway_id
```

### A. Edge / DNS / TLS

| Компонент | Статус | Доказательство |
|-----------|--------|----------------|
| `api.staging.aclearo.com` | ✅ live | CNAME → `*.apigw.yandexcloud.net`, `GET /api/health` 200 |
| `api.staging.aclearo.ru` | ✅ live | Тот же GW IP / health 200 |
| TLS | ✅ | LE cert `CN=api.staging.aclearo.com` (valid ~Jul–Oct 2026) |
| Helmet / rate limit | ✅ | HSTS + `ratelimit-*` headers на health |

### B. API runtime (Serverless behind GW)

| Компонент | Статус | Доказательство |
|-----------|--------|----------------|
| Process / routing | ✅ | JSON health, не Replit HTML |
| Postgres connectivity | ✅ | `database.ok: true`, latency ~50 ms, `pooler: false` |
| JWT auth | ✅ | `authDatabase: true`; `staging-auth-smoke.sh` register/login/me **Pass** |
| Cloud sync flag | ✅ | `features.sync: true` |
| AI scan | ✅ | `features.aiScan: true`, `aiScanProvider: "yandex"`, dailyBudget 100 |
| YC OCR | ✅ | `features.ycOcr: true` |
| Google pollen heatmap | ✅ (2026-07-28) | `features.pollenHeatmap: true`; tile HTTP 200 PNG; image `aclearo-api:phase1-418801c` |
| Replit (legacy) | ⚠️ still up | `aller-guide.replit.app/api/health` → урезанный `{ok, authDatabase}` без YC features |

### C. Инфра Terraform (ожидаемые ресурсы)

Код: [`infra/yandex/staging/`](../infra/yandex/staging/). По live API **косвенно** видно, что VPC+PG+Container+GW+TLS уже работали (health+DB+JWT). Прямой `terraform output` здесь не снят — чеклист для владельца folder:

| Ресурс (output) | Нужен для | Локально проверить |
|-----------------|-----------|--------------------|
| `network_id` / `subnet_id` | VPC | `terraform output` |
| `postgresql_fqdn` / `database_url` | private PG | только VPC / Lockbox |
| `container_registry_id` | YCR images | + GitHub `YC_REGISTRY_ID` |
| `serverless_container_id` | API runtime | + GitHub `YC_CONTAINER_ID` |
| `lockbox_secret_id` | env API | pollen keys ещё не отражены в health |
| `api_gateway_id` / `api_gateway_default_domain` | публичный HTTPS | DNS уже указывает на apigw |
| `certificate_id` | TLS custom domains | cert ISSUED (см. openssl) |
| `github_runner_public_ip` | migrate job | self-hosted `yc-staging-vpc` |
| `deploy_service_account_key` | CI push/deploy | GitHub `YC_SA_JSON` |

### D. CI / automation

| Item | Статус | Комментарий |
|------|--------|-------------|
| Workflow `deploy-staging.yml` | ⚠️ active, recent runs **fail** | Gate: нужны `YC_SA_JSON`, `YC_REGISTRY_ID`, `YC_CONTAINER_ID` (0s failure = secrets missing/incomplete на событии) |
| Trigger | push `staging` / `workflow_dispatch` | Не каждый PR |
| EAS profile `staging` | ✅ в репо | URL = YC |
| EAS profile `replit` | ✅ removed (Phase 3) | — |
| Replit (host) | ⚠️ still HTTP 200 | Pause in Phase 5 UI; `REQUIRE_REPLIT_PAUSED=1` |
| Phase 0 gate script | ✅ | `pnpm yc-stage-phase0` |

### E. Сводный чеклист (PR / ops)

- [x] DNS + TLS `api.staging.aclearo.com` / `.ru` на API Gateway
- [x] Health 200, `database.ok`, `authDatabase`
- [x] `features.sync` + `features.aiScan` (+ Yandex AI / `ycOcr`)
- [x] Auth smoke (`./scripts/staging-auth-smoke.sh`)
- [x] EAS `staging` → YC URL (не Replit)
- [x] Stage scripts/workflows без `replit.app`
- [x] Phase 2: `.env.staging.example` + `pnpm yc-stage-phase2`
- [x] Phase 3: Replit deploy artifacts removed
- [x] Phase 4: secrets inventory + `pnpm yc-stage-phase4` (ops rotation checklist remaining)
- [x] Lockbox: `POLLEN_HEATMAP_ENABLED=true` + `GOOGLE_POLLEN_API_KEY` → `features.pollenHeatmap: true`
- [x] Pollen tile HTTP 200 PNG **или** JSON 404 от proxy (не HTML) — `./scripts/staging-pollen-smoke.sh`
- [x] Image с `registerPollenRoutes` задеплоен (`BUILD_PUSH=1` / branch `staging`)
- [x] `pnpm yc-stage-phase0` без `ALLOW_MISSING_POLLEN_HEATMAP`
- [ ] GitHub Secrets `YC_*` + `YC_LOCKBOX_SECRET_ID` полные → зелёный `deploy-staging`
- [ ] Self-hosted runner `yc-staging-vpc` Idle (migrate)
- [ ] `STAGING_RUN_SMOKES=1` preflight (sync + scan)
- [ ] EAS Sensitive `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` + staging APK QA
- [x] Удалить EAS `replit` / docs hooks (фаза 3)
- [x] Phase 5 gate + YC acceptance smokes
- [ ] Pause Replit deployment (фаза 5 UI) → `REQUIRE_REPLIT_PAUSED=1 pnpm yc-stage-phase5`

**Вывод:** YC stage несёт API + DB + auth + sync + Yandex AI/OCR + pollen. Replit deploy artifacts removed (Phase 3). Secrets policy documented (Phase 4). **Phase 5:** pause Replit host in UI, then `REQUIRE_REPLIT_PAUSED=1 pnpm yc-stage-phase5`.

---

## Фазы 1–5

### 1 — YC API env: Lockbox pollen + полный mount + redeploy

**Цель:** `features.pollenHeatmap: true` на `api.staging.aclearo.com` и живой proxy `/api/pollen/heatmap/...`.

Live (до Phase 1 apply): tile отдаёт **HTML 404** — на revision нет pollen routes и/или нет Lockbox keys. Нужны **оба**: свежий image (`apps/api` с `registerPollenRoutes`) **и** env.

#### 1.1 Lockbox keys

Список mount: [`apps/api/lockbox-staging.keys`](../apps/api/lockbox-staging.keys).  
Обязательно добавить/обновить:

```text
POLLEN_HEATMAP_ENABLED=true
GOOGLE_POLLEN_API_KEY=<pollen server key>
POLLEN_RATE_LIMIT_WINDOW_MS=60000
POLLEN_RATE_LIMIT_MAX=120
```

Не класть pollen key в EAS / `EXPO_PUBLIC_*`.

#### 1.2 Команда (локально с `yc`)

```bash
# yc уже с SA (lockbox + serverless containers)
export GOOGLE_POLLEN_API_KEY='…'          # только Pollen API
export YC_LOCKBOX_SECRET_ID=e6qs399v1b3unstfh5rj   # или terraform output
export YC_CONTAINER_ID=…                 # terraform / console
export YC_REGISTRY_ID=…

# Upsert Lockbox + build/push image + deploy + smoke
BUILD_PUSH=1 pnpm yc-stage-phase1
# = ./scripts/yc-stage-phase1-enable-pollen.sh
```

Только Lockbox (без deploy): `SKIP_DEPLOY=1 pnpm yc-stage-phase1`

Проверка:

```bash
./scripts/staging-pollen-smoke.sh
pnpm yc-stage-phase0   # P0.4 должен стать PASS
```

#### 1.3 CI

[`.github/workflows/deploy-staging.yml`](../.github/workflows/deploy-staging.yml):

- Deploy монтирует **все присутствующие** ключи из `lockbox-staging.keys` (не только JWT/DB).
- Smoke вызывает `staging-pollen-smoke.sh` после preflight.
- Нужны GitHub Secrets: `YC_SA_JSON`, `YC_REGISTRY_ID`, `YC_CONTAINER_ID`, `YC_LOCKBOX_SECRET_ID`, `STAGING_API_URL`.

#### 1.4 Чеклист Phase 1

- [x] `GOOGLE_POLLEN_API_KEY` в Lockbox (не в git/EAS)
- [x] `POLLEN_HEATMAP_ENABLED=true` в Lockbox
- [x] Image с pollen routes задеплоен (`BUILD_PUSH=1` или push в `staging`)
- [x] Revision монтирует pollen keys (`yc-lockbox-deploy-secrets.sh`)
- [x] `curl …/api/health | jq .features.pollenHeatmap` → `true`
- [x] `./scripts/staging-pollen-smoke.sh` Pass
- [x] `pnpm yc-stage-phase0` без `ALLOW_MISSING_POLLEN_HEATMAP`

### 2 — Клиенты (только YC)

**Цель:** любые stage-сборки и локальные backend-сборки бьют в `https://api.staging.aclearo.com`, не в `*.replit.app`.

Автопроверка: `./scripts/yc-stage-phase2-gate.sh` / `pnpm yc-stage-phase2`.

#### P2 критерии

| ID | Проверка | Ожидание |
|----|----------|----------|
| **P2.1** | EAS profile `staging` | `EXPO_PUBLIC_API_URL=https://api.staging.aclearo.com`, auth on, pollen=`google` |
| **P2.2** | `apps/mobile/.env.staging.example` | тот же API URL, без `replit.app` |
| **P2.3** | npm scripts | `build:staging*` живы; `build:replit*` **отсутствуют** (после Phase 3) |
| **P2.4** | CI client workflows | `eas-staging-*` / `staging-apk-*` без replit targets |
| **P2.5** | Live API | health 200 на YC (pollen желателен после Phase 1) |
| **P2.6** | Docs | stage path описывает YC, не Replit как primary |

#### Что сделать оператору

1. Stage APK только так:
   ```bash
   pnpm --filter mobile build:staging:android
   # или Actions → EAS staging Android
   ```
2. EAS env (Sensitive, не Secret): `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` = Maps Android key.
3. Локально: `cp apps/mobile/.env.staging.example apps/mobile/.env`.
4. GCP Maps JS referrers: `localhost` + `staging.aclearo.*` — без опоры на `*.replit.app` для stage web.
5. Не использовать удалённые `build:replit:*` (Phase 3).

#### Чеклист Phase 2

- [x] `.env.staging.example` + docs stage → YC
- [x] `build:replit:*` removed (Phase 3; were deprecated stubs in Phase 2)
- [x] `pnpm yc-stage-phase2` gate
- [ ] EAS Sensitive `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` задан в expo.dev
- [ ] Staging APK установлен, login/sync/пыление против YC
- [x] (Phase 3) удалить EAS profile `replit` / `.replit` / archive deploy docs; OIDC opt-in only

### 3 — Cleanup репо

**Цель:** в репозитории нет Replit deploy/EAS profile; stage docs указывают только на YC.  
OIDC: **оставить** `apps/api/src/replit_integrations` за флагом `REPL_ID` (на YC не задаётся) — полный выпил OIDC/mobile `replit-exchange` отдельным follow-up, если web-login через Replit больше не нужен.

Автопроверка: `./scripts/yc-stage-phase3-gate.sh` / `pnpm yc-stage-phase3`.

#### P3 критерии

| ID | Проверка | Ожидание |
|----|----------|----------|
| **P3.1** | EAS / npm | нет `build.replit`; нет `build:replit:*`; есть `build:staging*` |
| **P3.2** | Deploy artifacts | нет `.replit`, `scripts/replit-*`, `.env.replit.example`, `.replit_integration_files` |
| **P3.3** | Docs | `replit-deploy.md` в `docs/archive/` с banner «do not use for staging» |
| **P3.4** | OIDC | код может остаться; `REPL_ID` не включается в `.env.staging.example` |

#### Сделано в Phase 3

- [x] Удалён EAS profile `replit`
- [x] Удалены `build:replit:*`, `.replit`, `scripts/replit-*`, `.env.replit.example`, `.replit_integration_files`
- [x] `docs/replit-deploy.md` → [`docs/archive/replit-deploy.md`](./archive/replit-deploy.md)
- [x] `pnpm yc-stage-phase3` gate
- [x] OIDC: keep behind `REPL_ID` (off on YC staging)

### 4 — Данные и секреты

**Цель:** единственные stores для stage secrets — **Lockbox** + **GitHub Actions** + **EAS Sensitive** (client Maps only); YC Managed PG — SoT данных; ключи, светившиеся вне stores, ротированы.

Автопроверка: `./scripts/yc-stage-phase4-gate.sh` / `pnpm yc-stage-phase4`  
Inventory: [`staging-secrets-inventory.md`](./staging-secrets-inventory.md)  
Rotation ops: [`staging-secrets-rotation-checklist.md`](./staging-secrets-rotation-checklist.md)

#### P4 критерии

| ID | Проверка | Ожидание |
|----|----------|----------|
| **P4.1** | Git hygiene | нет private key / live `AIza…` в tracked files; нет committed `.env` |
| **P4.2** | `lockbox-staging.keys` | содержит DB/JWT/sync/AI/pollen key **names** |
| **P4.3** | Client bundle | нет `EXPO_PUBLIC_*` для pollen/JWT/DB/YC AI; eas.json без pollen server key |
| **P4.4** | Docs | inventory + rotation checklist present |
| **P4.5** | Lockbox live (optional) | при настроенном `yc` — pollen/DB/JWT key names в payload |
| **P4.6** | Data policy | YC PG SoT; Replit DB не импортировать по умолчанию |

#### Ops (вручную)

1. Пройти [`staging-secrets-rotation-checklist.md`](./staging-secrets-rotation-checklist.md) (pollen key + YC authorized key из agent sessions).  
2. Убедиться, что GitHub Secrets §2 inventory заполнены → зелёный `deploy-staging`.  
3. EAS Sensitive: только `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.  
4. Не тащить Helium/Neon Replit в YC PG без явного dump-плана.

#### Чеклист Phase 4

- [x] Inventory + rotation checklist в docs  
- [x] `pnpm yc-stage-phase4` gate (repo hygiene)  
- [ ] Rotation A–C выполнена оператором (см. checklist)  
- [ ] GitHub `YC_*` / `STAGING_*` полные  
- [ ] EAS Maps Sensitive задан  

### 5 — Приёмка (pause Replit + final acceptance)

**Цель:** stage официально только на YC; Replit host не обслуживает API; все phase gates зелёные.

Автопроверка: `./scripts/yc-stage-phase5-gate.sh` / `pnpm yc-stage-phase5`

```bash
# Soft on Replit still-up (warn):
pnpm yc-stage-phase5

# Strict — fail until Replit paused:
REQUIRE_REPLIT_PAUSED=1 pnpm yc-stage-phase5

# + auth/sync/scan:
STAGING_RUN_SMOKES=1 pnpm yc-stage-phase5
```

#### P5 критерии

| ID | Проверка | Ожидание |
|----|----------|----------|
| **P5.1** | Phase 0, 2, 3, 4 gates | Pass |
| **P5.2** | YC live | health ok + sync/aiScan/pollen; pollen smoke Pass |
| **P5.3** | Repo stage paths | нет `aller-guide.replit.app` / EAS `replit` / `.replit` |
| **P5.4** | Replit host | `/api/health` **не** 200 (paused/unpublished/down) |

#### Pause Replit (ops UI)

Agent **не** имеет доступа к Replit Deployments. Сделайте вручную:

1. Откройте [replit.com](https://replit.com) → проект AllerGuide / A-Claro.  
2. **Deployments** (или Published App) → **Pause** / **Stop** / **Unpublish**.  
3. Опционально: отключите Always On / Autoscale; удалите production DB binding, если больше не нужен.  
4. Проверка:
   ```bash
   curl -sS -o /dev/null -w '%{http_code}\n' https://aller-guide.replit.app/api/health
   # ожидайте не-200 (000/404/502/…)
   REQUIRE_REPLIT_PAUSED=1 pnpm yc-stage-phase5
   ```

DNS для `*.replit.app` трогать не обязательно — достаточно pause deployment.

#### Чеклист Phase 5

- [x] `pnpm yc-stage-phase5` gate в репо  
- [x] YC health + pollen smoke (приёмка агентом)  
- [ ] **Pause Replit** в UI (ещё HTTP 200 на `aller-guide.replit.app` на момент прогона)  
- [ ] `REQUIRE_REPLIT_PAUSED=1 pnpm yc-stage-phase5` Pass  
- [ ] (рекомендуется) `STAGING_RUN_SMOKES=1` preflight Pass  
- [ ] EAS staging APK QA на устройстве  

---

## Связанные артефакты

| Путь | Роль |
|------|------|
| [`scripts/yc-stage-phase0-gate.sh`](../scripts/yc-stage-phase0-gate.sh) | Автоgate Phase 0 |
| [`scripts/yc-stage-phase1-enable-pollen.sh`](../scripts/yc-stage-phase1-enable-pollen.sh) | Phase 1 Lockbox pollen + deploy |
| [`scripts/yc-lockbox-upsert.sh`](../scripts/yc-lockbox-upsert.sh) | Merge keys → Lockbox version |
| [`scripts/yc-lockbox-deploy-secrets.sh`](../scripts/yc-lockbox-deploy-secrets.sh) | Mount `lockbox-staging.keys` |
| [`scripts/staging-pollen-smoke.sh`](../scripts/staging-pollen-smoke.sh) | Health + tile smoke |
| [`apps/api/lockbox-staging.keys`](../apps/api/lockbox-staging.keys) | Keys to mount from Lockbox |
| [`scripts/yc-stage-phase2-gate.sh`](../scripts/yc-stage-phase2-gate.sh) | Автоgate Phase 2 (clients → YC) |
| [`apps/mobile/.env.staging.example`](../apps/mobile/.env.staging.example) | Локальный stage env → YC |
| [`scripts/staging-preflight.sh`](../scripts/staging-preflight.sh) | P1.7 smokes |
| [`scripts/yc-stage-phase3-gate.sh`](../scripts/yc-stage-phase3-gate.sh) | Автоgate Phase 3 (Replit cleanup) |
| [`docs/archive/replit-deploy.md`](./archive/replit-deploy.md) | Archived Replit deploy (do not use) |
| [`scripts/yc-stage-phase4-gate.sh`](../scripts/yc-stage-phase4-gate.sh) | Автоgate Phase 4 (secrets hygiene) |
| [`docs/staging-secrets-inventory.md`](./staging-secrets-inventory.md) | Canonical secret stores |
| [`docs/staging-secrets-rotation-checklist.md`](./staging-secrets-rotation-checklist.md) | Ops rotation after leaks |
| [`scripts/yc-stage-phase5-gate.sh`](../scripts/yc-stage-phase5-gate.sh) | Автоgate Phase 5 (final acceptance) |
| [`docs/staging-yandex-cloud.md`](./staging-yandex-cloud.md) | Deploy YC |
| [`docs/gcp-pollen-maps-keys.md`](./gcp-pollen-maps-keys.md) | GCP + Lockbox pollen |
| [`apps/mobile/eas.json`](../apps/mobile/eas.json) | Profile `staging` |
