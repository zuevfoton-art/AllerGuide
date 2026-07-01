# API performance & infra (P2.7b)

## Redis rate limiting

When `REDIS_URL` is set (Upstash Redis, ElastiCache, etc.), all express rate limiters use `rate-limit-redis` with key prefixes:

| Prefix | Routes |
|--------|--------|
| `rl:global:` | All requests |
| `rl:auth:` | `/api/auth/*` |
| `rl:scan:` | `/api/scan` |

Without `REDIS_URL`, limiters fall back to in-memory store (single-instance only).

### Staging example (Upstash)

```bash
REDIS_URL=rediss://default:<token>@<host>.upstash.io:6379
```

Health check reports store type:

```json
"rateLimit": { "store": "redis", "ok": true, "latencyMs": 12 }
```

## Database health

`GET /api/health` includes:

```json
"database": {
  "ok": true,
  "latencyMs": 45,
  "pooler": true,
  "poolerWarning": "Neon pooler detected; set DB_PREPARE=false for transaction pooling"
}
```

### Neon pooled runtime

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://...@ep-xxx-pooler....neon.tech/...` |
| `DIRECT_DATABASE_URL` | unpooled host for migrations |
| `DB_PREPARE` | `false` |
| `DB_SSL` | `require` |

See [`apps/api/src/db/config.ts`](../apps/api/src/db/config.ts).

## Verification

```bash
pnpm --filter api test
curl -s https://api.staging.allerguide.app/api/health | jq '.database, .rateLimit'
```
