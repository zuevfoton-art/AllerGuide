# Gap: Figma → SOS (UX only)

Дата: 2026-09-18 · `3328:396` `screen-sos` → `/(tabs)/sos`

## Победители

| Слой | Источник |
|------|----------|
| UI / center CTA / passport | Figma |
| Call, geo, PDF, contacts, crisis | текущий код |

## Каркас

| Figma | Код |
|-------|-----|
| screen-header | `TabScreenHeader` |
| sos-center button + disclaimer | `SosEmergencyBar` + disclaimer |
| passport-card | profile/passport cards |
| — | crisis plan, grades, notes, tip (ниже) |

## Не трогаем

`sos-crisis-call`, passport edit, contacts, share/PDF.
