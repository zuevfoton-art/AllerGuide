---
name: Onboarding routing / profile-setup entry points
description: Why profile-setup navigation must use an explicit entry-point param, not the global onboardingComplete flag
---

# profile-setup serves two entry points

`apps/mobile/app/profile-setup.tsx` is reached from:
- the onboarding wizard (`app/onboarding.tsx` via `router.push`)
- "add a profile later" (`app/profiles.tsx`, `src/components/ProfileSwitcher.tsx`)

**Rule:** decide post-save navigation from an explicit route param (`?mode=add`), NOT from the global `isOnboardingComplete()` setting.

**Why:** `onboardingComplete` (and `scenario`) are GLOBAL persisted settings in the web IndexedDB store (`ag_settings`), and `logoutUser()` does NOT clear them. So once any user completes onboarding in a browser, a freshly-registered user during onboarding would hit the `router.back()` branch and get bounced back to the onboarding screen instead of forward to `/(tabs)/home`. This was the "filling profile doesn't navigate" bug.

**How to apply:** add-profile callers pass `/profile-setup?mode=add`; onboarding pushes plain `/profile-setup`. `save()` uses `params.mode === 'add'` to choose `router.back()` (with `canGoBack()` fallback to home) vs. the `shouldCompleteOnboarding` → replace-to-home path.

# createProfile can throw — save() must catch
With `EXPO_PUBLIC_BACKEND_AUTH=true`, `createProfile` (profile-service.ts) THROWS on session expiry / network error / non-ok backend response. Any caller that navigates on success must wrap it in try/catch and surface the error, or it fails silently (no nav, no message).
