# Gap: Figma Make zip → SOS

Дата: 2026-09-18 · zip `code-18.txt` → `/(tabs)/sos`

Канон композиции — **Figma Make zip**, не live-фрейм `3328:396`.

## Победители

| Слой | Источник |
|------|----------|
| UI / круг / паспорт | zip |
| Call, geo, PDF, contacts, crisis | текущий код |

## Каркас

| Zip | Код |
|-----|-----|
| title «Экстренная помощь» | `ScreenHeader` + `sos.emergencyTitle` |
| круг 160 `danger` + «SOS» / «Нажмите для вызова» / «Вызвать скорую помощь» | `SosEmergencyBar` (`sos-crisis-call`) |
| паспорт ФИО / аллергены / лекарства / контакт | zip passport card (`sos-profile-card`) |
| нет SOS-control в таббаре | SOS — пятый равный таб, `danger` только на лейбле |
| нет профиля | тот же круг, hint `sos.emptyProfile` вместо EmptyState-блокера; `sos-crisis-plan` жив |

## Не трогаем

`sos-crisis-call`, `sos-crisis-plan`, passport edit, contacts, share/PDF.
