# AllerGuide — UX/UI v2 concepts (простота ≤2 тапа)

Надстройка над [`wellness-ux-north-star.md`](./wellness-ux-north-star.md): измеримый контракт простоты, целевая IA, семантика контролов и сравнение трёх визуальных направлений **до** смены production-токенов.

**Интерактивный макет:** [`wellness-ux-v2-concepts.html`](./wellness-ux-v2-concepts.html)  
**Связанные документы:** [`brand-claro-green.md`](./brand-claro-green.md) · [`functional-requirements.md`](./functional-requirements.md) · [`codebase-index.md`](./codebase-index.md) · north-star [`wellness-ux-north-star.md`](./wellness-ux-north-star.md) / [`wellness-ux-north-star.html`](./wellness-ux-north-star.html)

> Реализация токенов, экранов и Ask sheet — **после** выбора одной палитры (§4). Домен, offline-first, clinical safety и тонкие экраны (`app/**` → `services` → `core`) не пересматриваются.

---

## 1. Контракт простоты

### 1.1. Что считаем «тапом»

Лимит **≤2 тапа до запуска действия**, а не до завершения клинически сложной формы.

| Глубина | Действия |
|---------|----------|
| **1 тап** | Чек-ин 0–3 · вход в Скан · вход на Карту · открытие кризисного SOS · «Спросить» (sheet) · primary на видимой рекомендации |
| **≤2 тапа** | Звонок 103 / контакт · полная запись дневника · отчёт врачу · смена профиля · отправка Ask после голоса/правки draft · раскрытие «Ещё N» + действие |
| **Не сокращать** | Юридические согласия · медицинские формы · подтверждение деструктивных действий · обязательный минимум онбординга (сценарий → имя/год → аллергены) |

### 1.2. Опора на практики

- Apple HIG / Material 3: крупные primary targets, одна иерархия действия на поверхность, progressive disclosure.
- WCAG 2.2 AA: контраст текста ≥4.5:1, тап ≥44 pt (Android ориентир 48 dp), цвет не единственный носитель статуса.
- USWDS progressive disclosure: сначала критичное, остальное под «Ещё N».
- Crisis-aware health UX: SOS доступен **без профиля и без сети**; паспорт — второй слой.

### 1.3. Карта текущих путей → цель

| Сценарий | Сейчас (типично) | Цель v2 |
|----------|------------------|---------|
| Чек-ин «как сегодня» | Часто через карточку-напоминание или полный дневник | Постоянный блок 0–3 на «Сегодня», 1 тап |
| Рекомендации | До 5 равных строк / CTA | Critical → important → одна recommended; остальное под «Ещё N» |
| Ask / чат | Отдельный маршрут `/ask` + FAB | Global FAB → full-height sheet; `/ask` — deep-link fallback |
| Голос в Ask | Отдельный путь / неясный send | Voice → расшифровка → **редактируемый draft** → send отдельным тапом |
| Скан | Возможны шаги до камеры | Camera-first |
| Карта | Возможны шаги до холста | Canvas-first + чипы/sheet фильтров |
| SOS | Риск энциклопедии на первом экране | Crisis mode; паспорт вторым слоем |
| Журнал | Много точек входа в типы записи | Один contextual sheet выбора типа |
| Профиль / маркет / эксперт | Разрозненный chrome; на большинстве экранов icon-only | Хаб с `/profile`; в оболочке — chip «значок + имя» (эталон Скан) |

---

## 2. Целевая IA

```text
Постоянная оболочка
├── Chrome профиля — chip: иконка + имя активного профиля (везде, кроме /profile)
├── Сегодня — ответ дня + чек-ин 0–3 + рекомендации по criticality
│   └── Ask — global FAB → AskChatSheet (voice-to-draft · keyboard-safe composer)
├── Журнал — история + sheet выбора типа полной записи
├── Скан — камера сразу → вердикт → sheet подробностей
├── Карта — холст сразу → чипы + sheet фильтров
└── SOS (отдельный control) — кризисный экран → паспорт вторым слоем

Chip профиля → switcher / хаб: профиль / настройки / маркет / эксперт
```

### 2.1. «Сегодня» — reading, чек-ин, приоритетные рекомендации

Убрать дублирующий chrome и вторичные CTA с первого viewport. Оставить:

1. Daily reading (одно предложение + мягкие KPI).
2. Чек-ин 0–3 (`SelectChip`).
3. Секция рекомендаций с явной критичностью.
4. Быстрые действия: без отдельного chip «Спросить» — Ask открывается **global FAB** поверх оболочки.

### 2.2. Уровни критичности рекомендаций

Уровень задаёт **домен** (`packages/core`), не экран.

| Уровень | Смысл | Примеры (ориентир) |
|---------|-------|-------------------|
| `critical` | Немедленное действие по безопасности / терапии | Напоминание терапии в окне приёма, urgent safety |
| `important` | Актуально сегодня или ограничено сроком | ACT due, возвращение после паузы, неполный профиль с safety-смыслом |
| `recommended` | Полезное улучшение без срочности | Wellness tip, phenotype tip |

**Правило показа**

1. Есть ≥1 `critical` → показать группу critical (внутри — стабильная сортировка).
2. Иначе есть ≥1 `important` → показать группу important.
3. Иначе → показать **одну** наиболее релевантную `recommended`.
4. Все остальные строки — под раскрытием «Ещё N рекомендаций» (без потери порядка).

**Primary CTA:** даже при нескольких видимых строках — только **одна** filled-primary у самого приоритетного действия; остальные — compact action rows / ghost. Уровень — текст + иконка, не только цвет. `danger` — только для реально срочных safety-сценариев.

### 2.3. Ask как global FAB + contextual sheet

- 1 тап FAB открывает полноразмерный chat bottom sheet поверх текущего экрана.
- FAB на Today / Journal / Scan / Map и stack-экранах вроде профиля; **нет** на SOS, auth, onboarding, `/ask`.
- В sheet: 3–4 контекстных `ActionChip`, история, collapsible disclaimer, keyboard-safe composer.
- Голос: OS speech → YC STT fallback → draft; send всегда отдельным тапом; аудио не хранить.
- Дистресс-фразы → handoff в полноэкранный SOS без вызова модели.
- Online AI за `EXPO_PUBLIC_AI_CHAT`; offline — локальные быстрые ответы / экспертные карточки.
- Маршрут `/ask` сохраняется как deep-link / full-screen fallback (без tab-bar bottom padding).

### 2.4. Профиль в chrome: значок + имя

Эталон в коде: [`ProfileHeaderButton`](../apps/mobile/src/components/ProfileHeaderButton.tsx) `variant="chip"` + `chipTitle={activeProfile.name}` на Сканере ([`scanner.tsx`](../apps/mobile/app/(tabs)/scanner.tsx) `brandHeaderRight`).

| Правило | Деталь |
|---------|--------|
| **Где** | Везде в оболочке, где есть кнопка или выбор активного профиля (Today, Journal, Scan, Map, Market, doctor-report и аналоги) |
| **Как** | Chip: иконка профиля + имя + chevron; не icon-only |
| **Исключение** | Сам экран/хаб `/profile` и связанные setup — имя уже в контенте, chrome-chip не дублировать |
| **No profile** | Без пустого chip; CTA создания профиля |
| **SOS / onboarding** | Crisis и intro не обязаны показывать chip; приоритет — safety / линейный вход |

Сейчас chip только на Сканере; `home` / `diary` / `map` / `market` / `doctor-report` — icon-only. Миграция — в §5 после выбора палитры.

### 2.5. Остальные поверхности

| Поверхность | Правило |
|-------------|---------|
| Scan | Camera-first; вердикт; подробности в sheet |
| Map | Canvas-first; фильтры — чипы + sheet |
| SOS | Crisis fullscreen; паспорт / энциклопедия — слой 2 |
| Journal | Клиническая глубина; тип записи — один sheet |
| Onboarding | 2 intro-слайда + минимум «сценарий → имя/год → аллергены» |

---

## 3. Семантика контролов

### 3.1. Кнопки

Текущий `Button` уже pill (`radii.full`). Усилить высоту, thumb-zone, контраст и copy:

| Роль | Высота | Заметки |
|------|--------|---------|
| Primary | 52 pt | Одна на поверхность |
| Secondary | 48 pt | |
| Crisis (SOS primary) | 60 pt | `danger` только для safety |
| Ghost / text | ≥44 pt hit | Compact rows рекомендаций |

### 3.2. Чипы и сегменты

| Компонент | Роль | Радиус |
|-----------|------|--------|
| `SelectChip` | Выбор / фильтр / состояние (симптом 0–3, аллерген, слой карты, период) | STATE `sm`/`md` |
| `ActionChip` | Явная быстрая команда («Спросить», готовый вопрос) | ACTION `full` или явный action treatment |
| `ProfileHeaderButton` chip | Активный профиль в chrome: иконка + имя (эталон Скан) | STATE `sm`/`md`; не icon-only вне `/profile` |
| `SegmentedControl` | Взаимоисключающие настройки | Группа ACTION; сегменты STATE |
| `BottomSheet` | Контекстный выбор и Ask chat | Не для длинных клинических форм и не для SOS |

Баблы — подсказки и feedback, не постоянная навигация. Деструктивные подтверждения — диалоги. Длинные формы и SOS — не маленький popup.

### 3.3. A11y invariants

- Targets ≥44 pt (≥48 dp ориентир Android), gap ≥8 pt.
- Текст масштабируется без обрезания (`MAX_FONT_SIZE_MULTIPLIER`).
- Статус: иконка + текст (+ цвет); никогда только цвет.
- Light / dark / system сохраняются; финальные пары — contrast-test.

---

## 4. Три визуальных концепта (выбор production-схемы)

Интерактивное сравнение: [`wellness-ux-v2-concepts.html`](./wellness-ux-v2-concepts.html).

| ID | Название | Фон / surface / action / soft / ink | Характер |
|----|----------|-------------------------------------|----------|
| **A** | Forest & Linen / Earth Wellness (**production**) | `#F7ECE1` / `#FFFCF8` / `#6E6E58` (Moss) / Sage `#E4E5D4`·`#A3A380` / Dusty Rose soft `#F3E9E2` / Slate info `#829399` / ink `#1C2624` | Тёплое прибежище + earthy photo-3; youthful radii / FAB Ask |
| **B** | Nordic Air (тёплый небо) — **архив** | `#F5F3EE` / `#FFFCF8` / `#4F8FB8` / `#D9EAF5` / `#1C2624` | Снят с production; остаётся в HTML для сравнения |
| **C** | Dusty Beige Sky | `#F3EEE6` / `#F7F5F2` / `#6E8399` / `#E5E2DC` (+ `#E2E7ED`) / `#2A2926` | Concept only |

**A wash:** Sage `#E4E5D4` → Dusty Rose soft `#F3E9E2` → canvas `#F7ECE1`. Dark A: `#14140F` / `#1E1D1A` / action `#A3A380` / soft `#2A2A22`.

**B wash (архив):** `#D9EAF5` → `#E8F1F6` → тёплый `#F3EDE4`.

**C wash:** беж → серый → пыльный синий ambient. Dark C: `#161512` / `#1E1D1A` / action `#9AADB8` / soft `#2C333A`.

Plum & Sage снят: не подходит как production-направление.

Во всех вариантах `danger` / `caution` / `success` — отдельная семантика с иконкой и текстом. Финальные пары — contrast-test.

**Правило внедрения:** production-схема **A — Forest Refuge · Earth Wellness** (layout A + палитра photo-3: Moss primary, Sage wash, Slate info, Dusty Rose soft). B и C остаются в HTML для сравнения.

### 4.1. Что покрывает HTML-прототип


- Переключатель A / B / C, light / dark, viewport 360×667 и 390×844.
- Chrome: profile chip «иконка · имя · ▾» на Today / Scan / Map / Journal / Ask overlay.
- Today: состояния `critical`, только `important`, только `recommended`, раскрытый «Ещё N».
- Ask sheet: быстрые вопросы, listening, processing, editable draft.
- Scan verdict, SOS crisis, Journal entry sheet, Map canvas-first, короткий onboarding.
- Ключевые empty / offline / error.

---

## 5. Связь с реализацией (после выбора)

Чеклист:

1. [x] Канон в north-star / FR / brand doc → **A Earth Wellness** (Moss/Sage/Slate/Rose).
2. [x] `criticality` + resolver в `packages/core` `home-insights.ts`.
3. [x] Semantic tokens → `theme.ts` / `layout.ts` / `claro-gradient.ts`; primitives `SelectChip`, `ActionChip`, `SegmentedControl`, `BottomSheet`, `AskChatPanel` / `AskChatSheet`.
4. [x] `ProfileHeaderButton` chip + имя (кроме `/profile` и setup).
5. [x] Voice-to-draft на `VoiceNoteButton` + `voice-dictation-service`.
6. [x] Analytics без PII (`ai_chat_voice_*`); Maestro `ask-smoke.yaml`; `pnpm check:analytics-taxonomy`.
7. [x] Global Ask FAB на оболочке (не Today chip); `/ask` layout без tab-bar padding; onboarding waves на Earth palette.

---

## 6. Acceptance

- [x] Tap-depth, IA, criticality, семантика контролов, profile chip.
- [x] HTML сравнивает A / B / C.
- [x] Production-палитра **A — Forest Refuge · Earth Wellness** (photo-3 Moss primary).
