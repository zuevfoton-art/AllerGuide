---
name: Production port mapping for autoscale deployments
description: The correct port to use for the API in production and why the port mapping keeps reverting
---

## Rule

The production API must listen on **port 23636** (set via `API_PORT=23636` in the `.replit` run command), NOT port 5000.

The `.replit` port mapping `localPort = 23636, externalPort = 80` is Replit's natural state for this project (driven by the mockup-sandbox workflow running on 23636). Replit's platform auto-assigns this when it rewrites `.replit`.

**Why:**
- Replit's autoscale healthcheck routes external port 80 → local port 23636 (configured via [[ports]])
- The mockup-sandbox vite server runs on port 23636 in dev; Replit maps it to external 80
- When Replit rewrites `.replit` (e.g. adding postgresql-16 module), it restores 23636→80
- If the API runs on port 5000 but the port mapping says 23636→80, the healthcheck gets `connection refused` or 500

**How to apply:**
- Production run command must include `API_PORT=23636`
- `.replit` [[ports]] for externalPort 80 should have `localPort = 23636`
- Dev run command uses default port 5000 (no API_PORT set) — dev uses the workflow port 5000 directly
