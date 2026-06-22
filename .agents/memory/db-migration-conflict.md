---
name: DB migration conflict with Replit Auth blueprint tables
description: Why fresh databases break drizzle migrations when Replit Auth blueprint pre-creates sessions/users, and how to recover.
---

## Symptom

Email/password auth endpoints (`/api/auth/register`, `/api/auth/login`) crash the API process with no logged error. Direct DB query reveals `relation "profile.app_users" does not exist`. Only `public.sessions` and `public.users` exist.

## Root cause

The Replit Auth blueprint (`javascript_log_in_with_replit`) creates `public.sessions` and `public.users` **directly** at install time, without any drizzle migration journal entry. Meanwhile the app's own drizzle migrations (`apps/api/drizzle/0000_*.sql` …) ALSO create `sessions` and `users` (migration 0000), plus the `profile` and `catalog` schema tables.

Because the migration journal (`drizzle.__drizzle_migrations`) is empty, `tsx src/db/migrate.ts` tries to run 0000 from scratch and fails on `CREATE TABLE "sessions"` → `relation "sessions" already exists` (42P07). So none of the profile/catalog tables ever get created.

**`drizzle-kit push` is NOT reliable here** — it reported "No changes detected" even though the profile/catalog schemas were entirely missing (it mishandles the diff against custom `pgSchema` tables). Use the versioned migrate script, not push.

## Recovery (dev)

`sessions`/`users` rows are disposable (OIDC re-upserts the user on next login). Drop them and run migrations from scratch:

```
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
```
then `cd apps/api && npx tsx src/db/migrate.ts`. Migration 0000 recreates `users`/`sessions` with the identical definition, then 0001-0003 build the profile/catalog schemas.

## Production risk

**Why this matters:** the same conflict will hit production on first deploy if the Replit Auth blueprint pre-creates `sessions`/`users` before migrations run. Before deploying, either make migration 0000's session/users creation idempotent (`CREATE TABLE IF NOT EXISTS`), or seed the migration journal so 0000 is marked applied. Do not blindly drop tables in production — they may hold real users.
