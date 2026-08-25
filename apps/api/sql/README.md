# SQL database definitions

The AllerGuide backend splits its data into two Postgres schemas ("databases"):

| File | Schema | Contents |
|------|--------|----------|
| `profile.sql` | `profile` | Per-user data: accounts, profiles, diary, scan results, emergency contacts, SOS notes, encrypted cloud backups. |
| `catalog.sql` | `catalog` | Global reference data: allergen taxonomy, cross-reactions, product/barcode catalog (indexed for search). |

Unused leftover `public.users` / `public.sessions` tables may still exist from
early schema history; the app does not use them.

## Source of truth

These `.sql` files are **reference/portability artifacts** that mirror the
Drizzle schema. The live database is created and evolved through Drizzle
migrations — do not run these by hand against a managed database:

```bash
pnpm --filter api db:migrate          # apply versioned migrations
pnpm --filter api db:seed-allergens   # populate catalog.allergens / cross_reactions
pnpm --filter api db:import-food-allergy  # populate catalog.products
pnpm --filter api db:seed-market      # published bundled marketplace → catalog.market_*
```

To bootstrap a throwaway database directly from these files instead:

```bash
psql "$DATABASE_URL" -f apps/api/sql/catalog.sql
psql "$DATABASE_URL" -f apps/api/sql/profile.sql
```
