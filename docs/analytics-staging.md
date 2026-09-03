# Analytics staging (P2.4b)

Mobile sends anonymized events to the API ingest endpoint. No PII (email, names, allergy details) is included — see `packages/core/src/analytics-events.ts`.

## Mobile (EAS staging)

| Variable | Value |
|----------|-------|
| `EXPO_PUBLIC_ANALYTICS_ENABLED` | `true` |
| `EXPO_PUBLIC_API_URL` | `https://api.staging.allerguide.app` |
| `EXPO_PUBLIC_ANALYTICS_ENDPOINT` | optional override; default `${API_URL}/api/analytics/events` |

Events are sent with an anonymous `client_id` stored in app settings (not linked to account).

## API (staging)

| Variable | Purpose |
|----------|---------|
| `ANALYTICS_INGEST_ENABLED` | Production: ingest off unless `true`. Dev/test: on unless `false`. Max 25 events / request. |
| `ANALYTICS_DASHBOARD_ENABLED` | set `true` to expose dashboard |
| `ANALYTICS_DASHBOARD_KEY` | required secret for `x-analytics-dashboard-key` header |
| `POSTHOG_API_KEY` | optional forward to PostHog |
| `POSTHOG_HOST` | default `https://us.i.posthog.com` |

### Endpoints

- **Ingest:** `POST /api/analytics/events` — single event object or `{ "events": [...] }`
- **Dashboard:** `GET /api/analytics/dashboard?days=7` — requires `ANALYTICS_DASHBOARD_ENABLED=true` and header `x-analytics-dashboard-key: <ANALYTICS_DASHBOARD_KEY>`

Example dashboard URL (staging):

```
curl -H "x-analytics-dashboard-key: $ANALYTICS_DASHBOARD_KEY" \
  "https://api.staging.allerguide.app/api/analytics/dashboard?days=7"
```

### Wired events

`screen_view`, `auth_*`, `profile_*`, `diary_*`, `scan_*` (включая `scan_dish_vision`), `sync_*`, `backup_*`, `sos_opened`, `wellness_refreshed`, `settings_changed`, `map_pollen_*`, `pollen_alert_sent`

See `apps/mobile/src/services/analytics-service.ts` and key flow call sites.
