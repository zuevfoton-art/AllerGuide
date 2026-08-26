# Bundled datasets

## Dish catalog

Curated typical recipes used for offline dish lookup in the scanner and diary.

- Source of truth for the bundled set: `dishes.json`
- Component vocabulary and matching live in `../dish-components.ts` / `../name-matching.ts`
- Component ids must exist in the TypeScript dictionary; unknown ids are dropped at load
- Typical composition only — not a restaurant-specific or lab analysis

Cuisine tags are informational. Aliases, declensions, typos, and Latin/Cyrillic
variants are resolved by the name-matching engine and do not need to be listed
exhaustively here.

## ADAIR clinic registry

Hardcoded overlay for the Places map (`adair-registry.json`), loaded by
`../adair-catalog.ts`.

- **People and roles:** https://adair.ru/struktura-adair/ (checked 2026-08-25)
- **Clinic addresses and phones:** official clinic sites and public medical
  directories (per-row sources are stored on each clinic)
- **Coordinates:** Nominatim / OpenStreetMap, WGS 84, geocoded 2026-08-26.
  Point is the building, not an entrance or office. Distributed under ODbL —
  mention OpenStreetMap on the Places layer.
- **Not an appointment schedule.** Confirm the branch and hours before a visit.
  Phone numbers and hours may change. Archived numbers of closed clinics are
  stored but not tappable.
- **Verification:** `confirmed` / `address-confirmed` / `needs-review` /
  `unconfirmed`. Unconfirmed and unlocated organizations have no map pin.
- Re-import: `node scripts/import-adair-registry.mjs <xlsx> packages/core/src/data/adair-registry.json`
- The xlsx itself is a research artifact and is not committed.
