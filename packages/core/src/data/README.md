# Dish catalog

Curated typical recipes used for offline dish lookup in the scanner and diary.

- Source of truth for the bundled set: `dishes.json`
- Component vocabulary and matching live in `../dish-components.ts` / `../name-matching.ts`
- Component ids must exist in the TypeScript dictionary; unknown ids are dropped at load
- Typical composition only — not a restaurant-specific or lab analysis

Cuisine tags are informational. Aliases, declensions, typos, and Latin/Cyrillic
variants are resolved by the name-matching engine and do not need to be listed
exhaustively here.
