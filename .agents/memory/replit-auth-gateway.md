---
name: Replit Auth gateway architecture
description: How the Express + Metro dual-server dev setup works for Replit Auth, and why it must stay same-origin.
---

## Architecture

- **Port 5000 (external, webview)**: `apps/api` Express server — workflow "Start application"
  - Command: `cd apps/api && METRO_URL=http://localhost:3001 npx tsx src/index.ts`
  - Handles all `/api/*` routes (Replit Auth OIDC, JWT mobile auth, profiles, sync, scan)
  - Proxies non-API requests to Metro via `http-proxy-middleware`
  - WS upgrade handler on `http.Server` forwards HMR to Metro
- **Port 3001 (internal, console)**: Expo Metro dev server — workflow "Start Metro"
  - Command: `cd apps/mobile && npx expo start --web --port 3001 --clear`

**Why same-origin matters:** Replit Auth OIDC sets an HttpOnly session cookie on the gateway domain. If the Expo app and the API were on different ports/domains, the session cookie wouldn't be sent with `/api/auth/replit-exchange` requests (cross-origin cookie restrictions). Putting Express on port 5000 and proxying Expo through it keeps everything on one domain.

## Auth flow (Replit Auth → JWT)

1. User clicks "Sign in with Replit" → `window.location.href = '/api/login'`
2. Express `/api/login` → Passport OIDC → Replit
3. Replit redirects to `/api/callback` → Passport sets session cookie → redirects to `/?replit_auth=1`
4. `apps/mobile/app/index.tsx` detects `?replit_auth=1`, calls `loginWithReplitExchange()`
5. `loginWithReplitExchange()` → `GET /api/auth/replit-exchange` (session cookie sent automatically)
6. Express verifies session, calls `findOrCreateReplitUser()`, issues JWT
7. JWT stored in mobile app; `isAuthenticated()` returns true; app navigates to tabs

## Key files

- `apps/api/src/app.ts` — Express app, helmet CSP disabled in dev (METRO_URL set), proxy middleware
- `apps/api/src/index.ts` — http.Server creation, WS upgrade handler for Metro HMR
- `apps/api/src/replit_integrations/auth/replitAuth.ts` — OIDC setup, redirects to `/?replit_auth=1`
- `apps/api/src/replit_integrations/auth/routes.ts` — `/api/auth/user` + `/api/auth/replit-exchange`
- `apps/api/src/services/app-user-service.ts` — `findOrCreateReplitUser()` creates loginType='replit' users
- `apps/mobile/app/index.tsx` — detects `replit_auth=1` in URL, calls exchange, bootstraps app
- `apps/mobile/app/login.tsx` — "Sign in with Replit" button (web-only)
- `apps/mobile/src/services/auth-service.ts` — `loginWithReplitExchange()` stores JWT + user

## Environment variables required

- `DATABASE_URL` — PostgreSQL (already set by Replit)
- `SESSION_SECRET` — session signing (already set)
- `JWT_SECRET` — JWT signing (set as env var, generated randomly)
- `REPL_ID` — Replit OAuth client ID (always set by Replit)
- `EXPO_PUBLIC_BACKEND_AUTH=true` — enables backend auth mode on mobile
- `METRO_URL=http://localhost:3001` — set in workflow command (not a Replit secret)

**Why:** `api-client.ts` uses `EXPO_PUBLIC_API_URL ?? ''` so all API calls are same-origin relative URLs (no hardcoded host needed).
