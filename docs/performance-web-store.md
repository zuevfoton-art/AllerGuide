# Web IndexedDB performance (P2.7c)

Scope: `apps/mobile/src/db/web-store.ts` — in-memory cache with async write-through to IndexedDB.

## Architecture

```
read/write (sync) → memory Map
                  ↘ debounced flush → IndexedDB (async)
```

Hydration runs once at startup (`hydrateWebStore` from `initDb`). Reads never block on IDB after hydration.

## P2.7 optimizations

1. **`requestIdleCallback` flush** — on web, dirty keys flush during idle time (`timeout: 500ms`) instead of a fixed 120 ms timer, reducing main-thread contention during navigation.
2. **Diagnostics** — `getWebStoreDiagnostics()` exposes `hydrated`, `memoryKeys`, `dirtyKeys` for profiling.
3. **Tests** — `web-store.test.ts` covers hydrate + debounced persistence.

## Profiling checklist (web)

1. `cd apps/mobile && npx expo start --web --port 5000`
2. Open DevTools → Performance; record cold load + diary save burst.
3. Confirm no long tasks &gt; 50 ms during `saveJson` bursts (flush should be idle-scheduled).
4. Application → IndexedDB → `allerguide` / `kv` — keys persist after reload.

## QA smoke (add to regression)

| # | Scenario | Expected |
|---|----------|----------|
| W.1 | Cold web load after prior session | Profiles/diary restored |
| W.2 | Add 5 diary entries quickly | UI responsive; data survives reload |
| W.3 | Offline reload | Data from IndexedDB, no localStorage fallback loss |

See also [qa-checklist.md](./qa-checklist.md) section **Web persistence**.

## Known limits

- Entire value is serialized per key (no partial updates).
- Very large diary history may grow `ag_diary` key — monitor size in Phase 3.
- localStorage migration runs once on first IDB open.

## Related

- [`performance-cold-start.md`](./performance-cold-start.md)
- [`architecture.md`](./architecture.md) — offline-first data layer
