# Gap: Figma → Auth / onboarding / profile (UX only)

Дата: 2026-09-18

| Figma | Route |
|-------|-------|
| `3328:12` screen-login | `/login` |
| `3328:50` screen-onboarding | `/onboarding-intro` |
| `3328:79` screen-profile | `/profile-setup` allergen step |

## Победители

UI/токены — Figma. Auth submit, slides, wizard save — текущий код.

## UI deltas

- Login: brand-hero, phone/email tabs, footer CTA (`purple` tab accent `#5D5FEF` в theme).
- Onboarding: illustration card + Skip/Next chrome.
- Profile allergen step: progress, search, category chips, sticky Save.

## Не трогаем

Auth services, onboarding navigation, profile-setup validation/save.
