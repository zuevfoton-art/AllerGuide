# Screen specs + стикеры (волна 2–5)

Формат стикера на каждом фрейме (skill product-designer §10, коротко):

```
Назначение · иерархия · компоненты/токены · loading/empty/error/offline/no-profile · a11y 44pt · testID
Тап → куда
Copy: RU (+30% DE в пометке, не 6 языков)
```

Пороги GINA/ACT/ARIA **не** рисовать как формулу. На макете — видимый исход.

## Волна 2 — ядро

### Сегодня `/(tabs)/home`

- **Назначение:** индекс дня + действия, не урезанный dashboard.
- **Иерархия:** `TabScreenHeader` (бренд + аватар → `/profile` + SOS) → `ImmuneBalanceCard` → compact reading + check-in smileys → insights → expert → `Disclaimer`. Week-ring — на журнале.
- **Компоненты:** `GlassCard soft`, rings 200, progress ×3 **Пыльца / Воздух / Дневник**, «Подробнее» → `ImmuneBalanceStatusSheet` (статус + factors/`TierScale`).
- **Тапы:** «Подробнее» → sheet FR-HOME-09; в sheet: пыльца → `/map?layer=pollen`; воздух → `/map?layer=air`; дневник → журнал; оценки → `/clinical-scales`; expert → `/expert`; reading CTA → карта; check-in smileys → `saveQuickCheckIn`.
- **Состояния:** default (есть wellness); empty factors / empty insights; offline (ядро живо, пыльца/воздух «нет данных»); no-profile (кольца/факторы скрыты, SOS жив).
- **A11y:** тап ≥44; rings `role=img`.
- **testID:** `immune-balance`, `immune-balance-score`, `immune-balance-card`, `immune-balance-status`, `home-factor-pollen|air|diary|clinical`, `home-insights`.
- **Нельзя упростить:** оси колец; ACT/ARIA/GINA только в sheet и на кольцах, не в текстах рекомендаций (FR-HOME-10).

### Журнал `/(tabs)/diary`

- **Назначение:** лента + вход в запись/курс/отчёт.
- **Иерархия:** `TabScreenHeader` → CTA ряд → week-ring → лента.
- **Тапы:** «Новая запись» → пикер типа; «Настроить курс» → терапия / АСИТ (АСИТ только pollinosis); «Отчёт» → `/doctor-report`; строка ленты → wizard секции.
- **Состояния:** empty feed; no-profile (CTA создать профиль, не ломать таб); offline = локальная лента.
- **Gating секций пикера:** explicit conditions (`profile-capabilities.ts` / [`cjm-profile-diary.md`](../cjm-profile-diary.md)). Карта/сканер/маркет **не** прятать.
- **testID:** diary new-entry / course / report (как в Maestro).

### Скан `/(tabs)/scanner`

- **Назначение:** вердикт по составу относительно профиля.
- **Иерархия:** `TabScreenHeader` → режимы камера/код/текст → **вердикт первым** → «Подробнее».
- **Состояния:** empty (ещё не сканировали); offline keyword/mock, не ложный Safe; no-profile — сканер работает, вердикт без персонализации.
- **Нельзя:** прятать режимы по типу аллергии (FR-PROF-12).

### Карта `/(tabs)/map`

- **Назначение:** холст пыльца / воздух / места.
- **Тапы:** легенда слоёв; deep-link `?layer=pollen|air` с Главной.
- **Состояния:** offline tiles (заглушка `mapLand`/`mapRoad`, не ErrorState ядра).

### SOS `/(tabs)/sos`

- **Назначение:** кризисный звонок + read-only паспорт.
- **Иерархия:** паспорт / 103 (`tapMinHeightCrisis` 60) / контакты.
- **no-profile:** крупный CTA 103. **Не** EmptyState «создайте профиль» как блокер.
- **Правки:** только `/sos-edit` из `/profile`.

## Волна 3 — хаб

| Экран | Тап с | Стикер-инвариант |
|-------|-------|------------------|
| `/profile` | аватар на табах | хаб: профили, settings, market, expert, ask, sos-edit, выход |
| `/profiles` | хаб | switch + удаление аккаунта (FR-AUTH-06) |
| `/profile-edit` | хаб / повторный тап активного | имя, год, аллергены, типы |
| `/settings` | хаб | backup **в ряд** (export/import · cloud send/restore) |
| `/market` | хаб / home links | **не таб** |
| `/expert` | home row / хаб | |
| `/ask` | хаб | composer над IME |
| `/sos-edit` | только `/profile` | не с вкладки SOS |
| `/notifications` | settings | |

## Волна 4 — вход

`/login` (phone/email) → `/register` опц. → `/onboarding-intro` (Skip\|Next) → `/onboarding` → `/profile-setup`.

Wizard (`PROFILE_SETUP_WIZARD_STEPS`): `name` → `birthYear` → `conditions` → `allergens` → deferred `crossReactions` → `allergenConfirmations` → `symptomBaseline` → `conditionHistory` → `comorbidity` → `phenotypeSummary` → `contacts`.

First-run может открыть Сегодня после required (`name`, `birthYear`, `conditions`, `allergens`).

## Волна 5 — клиника (не рисовать «всегда видимыми»)

| Экран | Когда в макете |
|-------|----------------|
| `/clinical-scales` | asthma / rhinitis / urticaria по capabilities |
| `/doctor-report` | из журнала |
| `/prescribed-therapy` | курс назначен / CTA «Настроить курс» |
| `/asit-course` | **только** explicit pollinosis |
| `/asthma-action-plan` | asthma |
| `/insect-action-plan` | insect |
| `/food-drug-registry` | foodFocus / drugFocus |
