# Analytics — closed beta checklist (GTM O2 / O4)

**Цель:** измерить onboarding completion и retention до soft launch.  
**Связано:** [`okr.md`](./okr.md) · P2.4 roadmap · `packages/core/src/analytics-events.ts`

## Staging / beta env

В EAS **staging** / internal preview:

```bash
EXPO_PUBLIC_ANALYTICS_ENABLED=true
EXPO_PUBLIC_API_URL=https://api.staging.aclearo.com
# optional override:
# EXPO_PUBLIC_ANALYTICS_ENDPOINT=https://api.staging.aclearo.com/api/analytics/events
EXPO_PUBLIC_SENTRY_DSN=<staging-dsn>
```

Production: включать только после privacy review; opt-in UX если требуется legal.

Local default в `.env.example` остаётся `false` (offline-first / privacy by default).

## События для GTM OKR

| Event | Когда | OKR |
|-------|--------|-----|
| `screen_view` | смена pathname (`_layout`) | O4 funnels |
| `auth_register` / `auth_login` | auth-service | O3 |
| `onboarding_scenario_selected` | выбор себя/ребёнка/оба | O2.2 |
| `profile_setup_step_*` | шаги wizard | O2.2 drop-off |
| `profile_created` | createProfile | O2.2, O4 |
| `onboarding_completed` | markOnboardingComplete | **O2.2 primary** |
| `diary_entry_saved` | diary-service | O4.3 |
| `scan_completed` / `scan_barcode` / `scan_dish_vision` | scanner | O4.2 |
| `diary_report_exported` | doctor PDF | O1, O4.5 |
| `sos_opened` | SOS tab | O4.4 |
| `market_click` | marketplace card | O5.3 |
| `map_pollen_*` | карта пыльцы | O4.6 |
| `wellness_refreshed` | home | O4 |
| `pollen_alert_sent` | push пыльцы | O4 |

**PII:** запрещены email/phone/name/allergies в props (`ANALYTICS_FORBIDDEN_KEYS`). UTM: передавать как `utm_source`, `utm_campaign`, `utm_content` (snake_case).

## Funnel: onboarding completion (KR2.2 ≥70%)

```
auth_register OR first open
  → onboarding_scenario_selected
  → profile_setup_step_view (name…contacts)
  → profile_created
  → onboarding_completed
```

**Formula:** `onboarding_completed` / `onboarding_scenario_selected` за cohort window (≥200 users).

## Retention proxies (KR4.1)

- D1 / D7: return `screen_view` или любой write-event после first `onboarding_completed`
- WEAC: diary OR scan AND (sos OR diary_report) in 30d

## Verify before beta invite

- [ ] Staging build с `ANALYTICS_ENABLED=true`
- [ ] `POST /api/analytics/events` принимает payload (см. `apps/api/src/routes/analytics.test.ts`)
- [ ] Dashboard key / PostHog forward (если настроен) видит `onboarding_completed`
- [ ] Sentry DSN ловит crash (не analytics)
- [ ] Clinic QR UTM сохраняется в install notes / first open (`utm_source=clinic`)

## Attribution (clinic channel)

Landing / QR: `https://aclearo.com/r/clinic?utm_source=clinic&utm_campaign=adair&utm_content={clinic_id}`  
Документировать в TestFlight notes до deep-link attribution infra.
