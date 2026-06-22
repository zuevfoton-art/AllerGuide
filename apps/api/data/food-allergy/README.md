# Food allergy dataset

Imported product / allergen data used to seed the `products` catalog.

- **Source:** https://github.com/alexf388/Food-Allergy-SQL-Database (`assignment3/src`)
- **Files:**
  - `allergy.csv` — `Allergy_ID,Allergy_name` (15 allergy types)
  - `foodproduct.csv` — `food_name,food_barcode`
  - `foodallergy.csv` — `Allergy_ID,food_barcode` (product → allergy mapping)

Imported via `pnpm --filter api db:import-food-allergy` (`src/db/import-food-allergy.ts`),
which maps each product's barcode to the set of allergy names and writes rows into
the `products` table with `source = 'food-allergy-db'`.

This is a small academic demo dataset (product names are randomized placeholders),
intended to bootstrap the barcode catalog. Real production data should come from a
licensed source (e.g. Open Food Facts) — see `docs/architecture.md`.
