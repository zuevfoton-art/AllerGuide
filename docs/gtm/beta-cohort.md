# Closed beta cohort — A-Claro (GTM O1 / O2 / O4)

**Цель:** 200–500 пользователей closed beta до public launch.  
**Состав (план):** 40% родители · 40% взрослые (поллиноз/астма) · 20% power users (АСИТ / пикфлоуметрия).  
**Канал №1:** клиники АДАИР (после [`adair-co-marketing-agreement-draft.md`](./adair-co-marketing-agreement-draft.md)).

## Источники набора

| Источник | Target invites | UTM |
|----------|----------------|-----|
| АДАИР clinics (QR / one-pager) | 150–250 | `utm_source=clinic&utm_campaign=adair` |
| Waitlist landing | 80–150 | `utm_source=waitlist` |
| Patient Telegram / VK (moderator invite) | 50–100 | `utm_source=community` |
| Doctor referral (brief) | 30–50 | `utm_source=doctor` |
| Internal / friends & family | 20 | `utm_source=internal` |

## Критерии включения

- RU primary (Москва / СПб / регионы pollen calendar — плюс)  
- iOS или Android (native preferred; web — secondary)  
- Готовность заполнять дневник ≥2×/неделя или сканировать ≥1×/неделя  
- Согласие на beta feedback (NPS на D7)

## Критерии исключения

- Ожидание «поставит диагноз» / телемедицину как must-have  
- Нет согласия на analytics (staging) / crash reports  
- Возраст &lt;18 без профиля родителя

## Инфра beta

1. EAS preview / TestFlight / Play Internal — см. [`eas-internal-preview.md`](../eas-internal-preview.md)  
2. Analytics + Sentry — [`analytics-beta.md`](./analytics-beta.md)  
3. Feedback: Telegram group + weekly 3-question form  
4. Support: `support@aclearo.com` с тегом `[beta]`

## Онбординг cohort

1. Invite email / SMS с ссылкой TestFlight + short video (scanner + SOS)  
2. День 0: сценарий → профиль → 1 скан → SOS  
3. День 3: nudge дневник  
4. День 7: NPS + «что сломалось»  
5. День 14: PDF для «воображаемого визита»

## Success gates (перед soft launch)

| Gate | Target |
|------|--------|
| Invited | ≥300 |
| Installed | ≥200 |
| Onboarding completed | ≥70% of installed |
| Crash-free | ≥99% |
| D7 retention | ≥25% |
| NPS | ≥30 |
| P0 bugs | 0 open |

## Трекинг roster (ops)

Вести таблицу (Notion/Sheets): email hash, segment, clinic_id, platform, invite date, installed Y/N, onboarding Y/N, NPS.

**Не хранить** медданные в roster.
