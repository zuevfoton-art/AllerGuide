# Cold start performance (P2.7a)

Target: **p95 cold start &lt; 3s** on mid-range Android (e.g. 4–6 GB RAM, Snapdragon 6xx class).

## What we measure

Phases recorded by `startup-metrics.ts` (ms from `layout_mount`):

| Phase | Description |
|-------|-------------|
| `layout_mount` | Root layout mounted (0 ms baseline) |
| `init_db_start` | SQLite / IndexedDB hydration begins |
| `db_ready` | `initDb()` finished, theme/locale hydrated |
| `app_ready` | Fonts loaded + DB ready → first interactive UI |

In dev builds, metrics are logged as `[startup-metrics]` when `app_ready` fires.

## Optimizations (P2.7)

1. **Deferred allergen catalog warm-up** — `warmAllergenCatalogCache()` runs after first paint via `InteractionManager.runAfterInteractions` (native) instead of blocking `db_ready`.
2. **Independent startup steps** — i18n, analytics, Sentry init are sync and isolated; DB failure does not crash the app.
3. **Web** — IndexedDB hydration still gates rendering (required for data correctness); allergen warm-up stays async.

## How to measure on device

1. Build staging APK: `eas build --profile staging --platform android`
2. Install on a physical mid-range device (not emulator).
3. Force-stop the app, clear from recents.
4. Launch cold 10×; note time until home screen is interactive.
5. Collect logcat: `adb logcat | grep startup-metrics`

**Pass:** p95 `app_ready` &lt; 3000 ms on test device.

**If above target:** see deferred work list below and file follow-up issues.

## Deferred / future work

| Item | Impact | Status |
|------|--------|--------|
| Allergen API fetch on startup | Medium | Deferred after interactions |
| SQLCipher for local DB | Security, not cold start | Phase 3 |
| Hermes bytecode / bundle split | Medium | Evaluate in Phase 3 |

## Related

- [`performance-web-store.md`](./performance-web-store.md) — web IndexedDB (P2.7c)
- [`phase-2-run.md`](./phase-2-run.md) — Phase 2 status
