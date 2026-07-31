# Staging secrets inventory (Yandex Cloud)

**Canonical stores:** Yandex Lockbox (`aclearo-staging-api-env`) + GitHub Actions secrets + EAS Sensitive env.  
**Never:** git, `EXPO_PUBLIC_*` for server keys, Replit Secrets, chat uploads.

Related: [`migrate-off-replit-to-yc.md`](./migrate-off-replit-to-yc.md) Phase 4 · [`staging-yandex-cloud.md`](./staging-yandex-cloud.md) §3 · [`apps/api/lockbox-staging.keys`](../apps/api/lockbox-staging.keys)

---

## 1. Lockbox `aclearo-staging-api-env`

Default id: `e6qs399v1b3unstfh5rj` (`terraform output -raw lockbox_secret_id`).

| Key | Purpose | Notes |
|-----|---------|--------|
| `DATABASE_URL` | Runtime PG | Private Managed PG |
| `DIRECT_DATABASE_URL` | Migrations | Same host OK on YC (no Neon pooler) |
| `DB_SSL` | TLS | `require` |
| `JWT_SECRET` | Mobile JWT | Rotate if ever leaked |
| `SESSION_SECRET` | Cookie sessions (OIDC legacy) | Unused when `REPL_ID` unset |
| `SYNC_ENABLED` | Cloud backup | `true` on staging |
| `AI_SCAN_ENABLED` / `AI_PROVIDER` | Scan | `yandex` on staging |
| `YC_FOLDER_ID` / `YC_AI_API_KEY` / `YC_OCR_ENABLED` | Yandex AI | API key ≠ authorized key JSON |
| `YC_SCAN_INTENT_LLM` | GPT intent `/api/scan/intent` | `true` (+ `AI_SCAN_ENABLED`) → health `ycScanIntentLlm` |
| `YC_SEARCH_ENABLED` | Search `/api/search/ingredients` | `true` (+ `YC_AI_*`) → health `ycSearch` |
| `YC_STT_ENABLED` | SpeechKit `/api/stt` | `true` on staging for QA |
| `YC_GPT_MODEL` | Foundation Models URI suffix | `yandexgpt-lite` (explicit) |
| `SCAN_DAILY_BUDGET` | LLM scan budget | e.g. `100` |
| `SCAN_REQUIRE_AUTH` | Scan auth | `true` |
| `CORS_ORIGINS` | Web CORS | staging.aclearo.* + localhost |
| `POLLEN_HEATMAP_ENABLED` | Pollen proxy | `true` |
| `GOOGLE_POLLEN_API_KEY` | Google Pollen API | **server only**; never EAS |
| `POLLEN_RATE_LIMIT_*` | Rate limits | optional defaults |

Mount list for Serverless: [`apps/api/lockbox-staging.keys`](../apps/api/lockbox-staging.keys).  
Upsert without wipe: `./scripts/yc-lockbox-upsert.sh KEY=VALUE`.

Audit names only (no values printed):

```bash
yc lockbox secret get --id e6qs399v1b3unstfh5rj --format json \
  | jq -r '.currentVersion.payloadEntryKeys[]' | sort
```

---

## 2. GitHub Actions (repo secrets)

Required for [`.github/workflows/deploy-staging.yml`](../.github/workflows/deploy-staging.yml):

| Secret | Source |
|--------|--------|
| `YC_SA_JSON` | Deploy SA authorized key JSON (`aclearo-staging-deploy`) |
| `YC_REGISTRY_ID` | `crpf0kl3mrg2qnnd374l` / terraform |
| `YC_CONTAINER_ID` | `bba700s2t35i2khgmiit` / terraform |
| `YC_LOCKBOX_SECRET_ID` | `e6qs399v1b3unstfh5rj` |
| `STAGING_DATABASE_URL` | Lockbox / terraform `database_url` |
| `STAGING_DIRECT_DATABASE_URL` | same |
| `STAGING_API_URL` | `https://api.staging.aclearo.com` |
| `EXPO_TOKEN` | expo.dev (mobile jobs) |

Do **not** put `GOOGLE_POLLEN_API_KEY` in GitHub unless a dedicated upsert workflow needs it (prefer local `yc-lockbox-upsert` / Phase 1 script).

---

## 3. EAS / Expo (client only)

| Name | Visibility | Value |
|------|------------|--------|
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | **Sensitive** (not Secret) | Maps Android (or JS) restricted key |
| Profile `staging` env | in `eas.json` | API URL = YC; no server pollen key |

Forbidden in EAS: `GOOGLE_POLLEN_API_KEY`, `JWT_SECRET`, `DATABASE_URL`, YC AI keys.

---

## 4. Data (Postgres)

| Store | Role |
|-------|------|
| YC Managed PostgreSQL (private IP) | **Source of truth** for staging |
| Replit Helium / old Neon | **Do not** use; no automatic import in Phase 4 |

Optional one-time ops (from VPC runner):

```bash
pnpm --filter api db:migrate
pnpm --filter api db:seed-allergens
# pnpm --filter api db:import-food-allergy   # only if catalog needed
```

Import from Replit only with an explicit dump/restore plan (out of scope unless product asks).

---

## 5. Rotation (keys exposed outside Lockbox)

If a key was pasted in chat, Cursor uploads, or a laptop clipboard, **rotate** it. Checklist: [`staging-secrets-rotation-checklist.md`](./staging-secrets-rotation-checklist.md).

High priority from migrate sessions:

1. **GCP Pollen API key** (server) — recreate in Google Cloud Console → update Lockbox → redeploy revision  
2. **YC authorized key** used by agents (`aclearo-staging-bootstrap` / deploy) — delete key id in IAM → create new JSON → update GitHub `YC_SA_JSON` if deploy key  
3. **GCP service account JSON** (Maps/audit) — delete key in GCP IAM if uploaded to chat  
4. Optional: `JWT_SECRET` / `SESSION_SECRET` if ever shared
