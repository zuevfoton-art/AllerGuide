# Staging secrets rotation checklist (Phase 4)

Ops sign-off after keys left Lockbox/GitHub/EAS (chat, uploads, screenshots).  
**Do not paste secret values into this file or git.**

Inventory: [`staging-secrets-inventory.md`](./staging-secrets-inventory.md)

---

## Procedure template

For each item: create new credential → update store → smoke → **delete old** credential.

### A. Google Pollen API key (server)

- [ ] GCP Console → APIs & Services → Credentials → create new API key  
- [ ] Restrict: **Pollen API** only (+ IP of staging API if stable)  
- [ ] `GOOGLE_POLLEN_API_KEY=<new> ./scripts/yc-lockbox-upsert.sh --pollen`  
- [ ] `REQUIRE_POLLEN=1 ./scripts/yc-lockbox-deploy-secrets.sh` (same image OK)  
- [ ] `./scripts/staging-pollen-smoke.sh` Pass  
- [ ] Delete **old** pollen key in GCP  

### B. Yandex Cloud authorized key (deploy / bootstrap)

- [ ] IAM → service account → delete compromised key id  
- [ ] Create new authorized key JSON  
- [ ] Update GitHub secret `YC_SA_JSON` (deploy SA) **or** operator local keychain only  
- [ ] `yc config set service-account-key <new.json>` smoke: `yc lockbox secret get --id e6qs399v1b3unstfh5rj`  
- [ ] Shred local JSON copies  

### C. GCP Maps / audit service account JSON

- [ ] GCP IAM → SA → Keys → delete uploaded key id  
- [ ] If Maps still uses API keys (not SA): confirm Android/iOS/JS keys unchanged  
- [ ] No SA JSON in Cursor uploads / repo  

### D. Google Places / Air Quality Maps Platform key (server)

- [ ] GCP Console → create a new key restricted to **Places API (New)** + **Air Quality API**  
- [ ] `MAPS_PLATFORM_API_KEY_FILE=<new> ./scripts/yc-stage-enable-places-air-quality.sh`  
- [ ] `./scripts/staging-places-air-quality-smoke.sh` Pass  
- [ ] Delete **old** Maps Platform key in GCP (especially if it was uploaded in chat)

### E. Optional app secrets

- [ ] Rotate `JWT_SECRET` / `SESSION_SECRET` in Lockbox if leaked (forces re-login)  
- [ ] Redeploy Serverless revision after Lockbox version bump  

### F. Verify stores

- [ ] Lockbox payload keys match [`apps/api/lockbox-staging.keys`](../apps/api/lockbox-staging.keys) (names)  
- [ ] GitHub Actions secrets present (see inventory §2)  
- [ ] EAS has Sensitive `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` only (no pollen)  
- [ ] `pnpm yc-stage-phase4` Pass  

---

## Sign-off

| Field | Value |
|-------|--------|
| Date (UTC) | |
| Operator | |
| Notes | |

Gate `yc-stage-phase4` does **not** require this table filled (ops-only). Keep unchecked items visible until rotation is done.
