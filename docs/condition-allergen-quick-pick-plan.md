# План: быстрый выбор аллергенов по выбранному типу аллергии

Регистрация → онбординг → мастер профиля. Шаг **«Какая у тебя аллергия?»** (типы состояний) должен определять, какие аллергены предлагаются на шаге **«Аллергены»**: релевантные — чипами для быстрого выбора, остальные — под кнопкой полного каталога.

**Связано:** [`functional-requirements.md`](./functional-requirements.md) §6.1 (FR-PROF-02, FR-PROF-03) · [`allergy-taxonomy-roadmap.md`](./allergy-taxonomy-roadmap.md) §2.2 (пробел «Поллиноз: option vs allergen rows») · [`architecture.md`](./architecture.md) · [`development-rules.md`](./development-rules.md) · [`maestro.md`](./maestro.md)

---

## 1. Сценарии

| # | Сценарий | Ожидаемое поведение |
|---|----------|---------------------|
| S1 | Пользователь выбрал **Поллиноз** | На шаге аллергенов быстрым выбором идут пыльцевые: берёза, ольха, злаки, полынь, амброзия, олива |
| S2 | Пользователь выбрал **Бронхиальную астму** или **Аллергический ринит** | Быстрым выбором идут ингаляционные триггеры: клещи, бытовая пыль, плесень, кошка, собака + основные пыльцевые |
| S3 | Выбрано несколько типов (например, поллиноз + астма) | Рекомендации сгруппированы по типам в порядке выбора, дубли убраны |
| S4 | Выбран только **«Другие виды аллергии»** | Fallback на текущий список частых аллергенов — экран не пустой |
| S5 | Аллерген выбран, потом тип снят | Аллерген **остаётся выбранным** и переезжает в блок «Из полного списка» — молчаливой потери данных нет |
| S6 | Нужен аллерген вне рекомендаций | Кнопка полного каталога (`AllergenCatalogModal`) — весь каталог с поиском |

Не входит в объём: изменение gating модулей дневника (FR-PROF-10…12), АСИТ/ПСВ, cross-reactions (отдельный шаг), пыльцевой календарь.

---

## 2. Что есть сейчас

| Слой | Файл | Поведение |
|------|------|-----------|
| Шаг типов | `apps/mobile/src/components/profile-setup/ProfileSetupConditionsStep.tsx` → `ConditionPicker` | 11 чипов из `ALLERGY_CONDITION_TYPES`; под-опции скрыты (`showOptions=false`, FR-PROF-03) |
| Шаг аллергенов | `.../ProfileSetupAllergensStep.tsx` → `AllergenPicker` | **Статичные** `getPopularAllergens()` — 10 id, из пыльцевых только `birch-pollen` |
| Каталог | `AllergenCatalogModal` → `ListPickerSheet` | Полный каталог по категориям с поиском |
| Маппинг | `packages/core/src/condition-allergen-map.ts` | `CONDITION_OPTION_ALLERGEN_MAP`: под-опция типа → allergen id; + пыльцевые таксоны и legacy-алиасы |
| Pre-seed | `packages/core/src/condition-option-selections.ts` | `allergenIdsFromConditionOptions`, `mergePreSeededAllergens` — уже умеет добавлять аллергены от опций, не стирая ручной выбор |

**Разрыв.** Быстрый список не зависит от выбранных типов. При поллинозе полынь, амброзия, злаки, ольха и олива лежат в полном каталоге, хотя это самый частый выбор такого пользователя.

**Замер на текущей сборке** (веб, `/profile-setup?mode=add`). Блок «Частые аллергены» при выбранном **Поллинозе** и при выбранной **Бронхиальной астме** идентичен — 10 чипов в одном и том же порядке:

> Молоко · Яйца · Арахис · Орехи · Рыба · Пшеница / глютен · Соя · Пыльца берёзы · Пылевые клещи · Пенициллин

Пыльца полыни, амброзии и злаков доступны только через «Выбрать из полного списка» → поиск. Для профиля с поллинозом это 7 нерелевантных чипов из 10 и три обязательных обращения к каталогу.

**Чего не хватает в маппинге.** У `asthma`, `rhinitis`, `dermatitis`, `urticaria`, `other` нет `options` в `ALLERGY_CONDITION_TYPES`, поэтому `CONDITION_OPTION_ALLERGEN_MAP` их не покрывает. У `drug` запись в маппинге есть, а опций в типах уже нет. Значит одного маппинга опций недостаточно — нужен явный набор рекомендаций на **тип**, а не на под-опцию.

---

## 3. Целевая архитектура

Доменные данные и порядок — в `packages/core`; экран только рендерит (`development-rules.md` §2.2).

### 3.1. Новый модуль ядра

`packages/core/src/condition-allergen-recommendations.ts`

```ts
/** Рекомендованные аллергены на тип состояния (id из allergen-database). */
export const CONDITION_RECOMMENDED_ALLERGEN_IDS: Record<AllergyConditionId, ProfileAllergenId[]>

/** Каталог может приходить с бэкенда — незнакомые id отбрасываются, не падаем. */
export function getRecommendedAllergensForConditions(
  conditionIds: AllergyConditionId[],
  catalog?: AllergenRecord[],
): AllergenRecommendationGroup[]   // { conditionId, label, allergens }

/** Плоский дедуплицированный список — для «Из полного списка» и тестов. */
export function getRecommendedAllergenIds(conditionIds: AllergyConditionId[]): ProfileAllergenId[]
```

Правила:

- Порядок групп — порядок выбора типов; внутри группы — порядок из константы (клиническая частота, не алфавит).
- Дедупликация между группами: аллерген показывается в первой группе, где встретился.
- Пустой вход, только `other`, или ни одного id в каталоге → fallback `getPopularAllergens()`.
- Экспорт через barrel `packages/core/src/index.ts`; `condition-allergen-map.ts` остаётся источником для под-опций и пыльцевых таксонов (не дублировать).

### 3.2. Наборы рекомендаций

| Тип | Рекомендованные id | Опора |
|-----|--------------------|-------|
| `food` | `milk`, `eggs`, `wheat-gluten`, `tree-nuts`, `peanut`, `fish`, `seafood`, `soy` | EU Reg. 1169/2011 Annex II (уже в `evidence-registry`) |
| `pollinosis` | `birch-pollen`, `alder-pollen`, `grass-pollen`, `mugwort-pollen`, `ragweed-pollen`, `olive-pollen`, `hazel-pollen`, `oak-pollen`, `ash-pollen`, `saltwort-pollen`, `maple-pollen`, `poplar-pollen`, `willow-pollen` | Сезоны из `ALLERGY_CONDITION_TYPES.pollinosis.options`; свёртка после 8 чипов |
| `asthma` | `dust-mites`, `house-dust`, `mold`, `cat-dander`, `dog-dander`, `birch-pollen`, `grass-pollen`, `mugwort-pollen` | GINA — список триггеров, **не** порог |
| `rhinitis` | `dust-mites`, `house-dust`, `cat-dander`, `dog-dander`, `mold`, `birch-pollen`, `grass-pollen`, `mugwort-pollen` | ARIA |
| `dermatitis` | `dust-mites`, `milk`, `eggs`, `wheat-gluten`, `cat-dander`, `mold` | РААКИ КР по АтД |
| `urticaria` | `nsaid`, `aspirin`, `penicillin`, `fish`, `seafood`, `peanut`, `latex` | — |
| `household` | `dust-mites`, `house-dust`, `mold` | `CONDITION_OPTION_ALLERGEN_MAP.household` |
| `animal` | `cat-dander`, `dog-dander`, `rodent`, `bird`, `horse`, `rabbit` | `CONDITION_OPTION_ALLERGEN_MAP.animal` |
| `drug` | `penicillin`, `cephalosporins`, `nsaid`, `aspirin`, `paracetamol` | `CONDITION_OPTION_ALLERGEN_MAP.drug` |
| `insect` | `bee-venom`, `wasp-venom`, `hornet-venom`, `mosquito` | `CONDITION_OPTION_ALLERGEN_MAP.insect` |
| `other` | — (fallback на популярные) | FR-PROF-03: тип уточняется текстом |

Все id проверены по `packages/core/src/allergen-database.ts` — инвариант закрепляется тестом.

**Пыльца с отдельной строкой каталога.** Лещина, дуб, клён, ясень, ива, тополь и лебеда получили строки `*-pollen` (см. [`calendar-pollen-allergen-rows-plan.md`](./calendar-pollen-allergen-rows-plan.md)) и входят в быстрый выбор поллиноза. Пять злаковых опций по-прежнему сходятся в один `grass-pollen`.

### 3.3. Экран (спецификация)

**Назначение:** шаг «Аллергены» мастера профиля и блок аллергенов в `/profile-edit`.

**Иерархия:** `GlassCard` → `ui.sectionLabel` «Аллергены» → подсказка `ui.docMeta` → **группы рекомендаций** (на группу — `sectionHint`, 11 uppercase, с названием типа) → блок «Из полного списка» (выбранное вне рекомендаций) → кнопка полного каталога → карточки подсказок (тип состояния / cross-reactions).

**Компоненты и токены:** существующие `styles.chip` / `chipActive` из `AllergenPicker` (`radii.sm`, не `radii.full` — чип держит состояние, `design-tokens.mdc`); цвет только из `useTheme()`; тап-цель ≥44 или 36 + `hitSlop`.

**Состояния:**

| Состояние | Поведение |
|-----------|-----------|
| Типы выбраны | Группы рекомендаций; кнопка полного каталога остаётся на месте и подписью не меняется |
| Только `other` / типов нет | Текущий блок «Частые аллергены» без изменений |
| Каталог с бэкенда не отдал id | Отфильтровать, группа не пустеет молча — при пустом результате fallback на популярные |
| Выбранное вне рекомендаций | Блок «Из полного списка» (сейчас считается от популярных → считать от рекомендованных) |
| offline | Полностью работает: данные в `packages/core`, сеть не нужна |

**A11y:** `accessibilityRole="button"`, `accessibilityState={{ selected }}`, `accessibilityLabel` = имя аллергена; заголовок группы не интерактивен.

**i18n** (`types.ts` + все 6 локалей `locales/{ru,en,es,fr,de,it}.ts`):

| Ключ | RU | Статус |
|------|-----|--------|
| `allergens.recommendedTitle` | Рекомендуем для выбранных типов | новый |
| `allergens.recommendedHint` | Отметьте свои. Остальные — в полном списке. | новый |
| `allergens.recommendedGroup` | «{{label}}» | новый |
| `allergens.popular` | Частые аллергены | есть — остаётся для fallback S4 |
| `allergens.openCatalog` | Выбрать из полного списка | есть — не переименовывать |
| `allergens.catalogTitle` | Все аллергены | есть — заголовок модалки уже верный |

**testID для Maestro:** `allergen-${id}` сохраняется (от него зависят текущие флоу); добавляются `allergen-recommended-${conditionId}` и `allergen-open-catalog`.

### 3.4. Проводка

| Экран | Изменение |
|-------|-----------|
| `ProfileSetupAllergensStep` | Новый проп `conditionIds`; `profile-setup.tsx` передаёт `conditions` (шаг типов обязателен — `conditions_required`) |
| `AllergenPicker` | Новый **опциональный** проп `conditionIds?: AllergyConditionId[]`; без него — текущее поведение (обратная совместимость) |
| `profile-edit.tsx` | Передаёт `conditions` из `getStoredProfileConditions` — редактирование и мастер ведут себя одинаково; у легаси-профилей без типов остаются популярные |

Снятие типа не трогает `selected` — только пересчитывает группы (S5). Уже выбранное показывается в «Из полного списка».

---

## 4. Аналитика

Новые имена событий не нужны — расширяем props существующего `profile_setup_step_complete` на шаге `allergens`:

- `recommended_count` — сколько выбрано из рекомендаций
- `catalog_count` — сколько выбрано из полного каталога
- `condition_count` — сколько типов выбрано

Ограничения `analytics-events.mdc`: props без PII (сами id аллергенов **не** отправляем), `snake_case`, эмиссия из `src/services/*`. Метрика успеха: доля профилей, где хотя бы один аллерген выбран из рекомендаций, и падение доли открытий полного каталога на шаге.

---

## 5. Этапы

| Этап | Объём | Проверка |
|------|-------|----------|
| P1 | Ядро: `condition-allergen-recommendations.ts` + экспорт в barrel + тесты. UI не меняется | `pnpm --filter @allerguide/core test` |
| P2 | `AllergenPicker`: группы рекомендаций, «Из полного списка» от рекомендованных, i18n (6 локалей), testID | `pnpm typecheck`, `pnpm --filter mobile lint` |
| P3 | Проводка `profile-setup` + `profile-edit`, S5 (снятие типа), fallback S4 | `pnpm --filter mobile test` |
| P4 | Аналитика, Maestro-флоу, документы | `pnpm rc-gate`, `pnpm check:analytics-taxonomy` |

Каждый этап — отдельный коммит; P1 обратимо и не влияет на пользователя.

---

## 6. Тесты

**Ядро** — `packages/core/src/condition-allergen-recommendations.test.ts`:

- `pollinosis` → содержит `birch-pollen` и `mugwort-pollen`
- `asthma` / `rhinitis` → содержат `dust-mites`
- `['pollinosis','asthma']` → порядок групп по выбору, `birch-pollen` не дублируется
- `[]` и `['other']` → результат равен `getPopularAllergens()`
- **инвариант:** каждый id из `CONDITION_RECOMMENDED_ALLERGEN_IDS` есть в `ALLERGENS`
- каталог с бэкенда без части id → отфильтровано, без исключения
- покрыты все 11 `AllergyConditionId` (гарантия от забытого типа при расширении таксономии)

**Mobile** — группировку и подписи вынести в чистый хелпер (`src/services/allergen-recommendation-display.ts`), тесты в node-окружении по образцу `scan-match-display.test.ts`. Рендер RN не тестируем.

**Maestro** — `_complete-first-run-profile.yaml` тапает `condition-food` → `allergen-milk`; `milk` остаётся первым в рекомендациях `food`, флоу не ломается. Добавить проверку S1: выбрать `condition-pollinosis`, дождаться `allergen-birch-pollen`, и инвариант в `scripts/maestro-ci-check.test.mjs`.

---

## 7. Риски

| Риск | Митигация |
|------|-----------|
| Ломается offline nightly Maestro | `milk` остаётся в рекомендациях `food`; отдельный инвариант в `maestro-ci-check` |
| Каталог с бэкенда (`EXPO_PUBLIC_PRODUCT_DB`) не содержит id | Фильтрация по резолвленному каталогу + fallback на популярные |
| Список на 3+ типах слишком длинный | Группы с заголовками; свёртка группы после 8 чипов (`ALLERGEN_GROUP_VISIBLE_LIMIT`), выбранные всегда видимы |
| Правило GINA для астмы | Рекомендации — список триггеров, не порог. Если регистрировать как астма-фичу, то id в `GINA_ASTHMA_FEATURE_IDS` + тест в `gina-asthma.test.ts` ([`development-rules.md`](./development-rules.md) §2.5) |
| Потеря выбранных аллергенов при снятии типа | S5 закреплён тестом хелпера |
| Рассинхрон с `condition-allergen-map.ts` | Рекомендации на **тип**, маппинг — на **под-опцию**; тест сверяет, что рекомендации не противоречат маппингу там, где он есть |

---

## 8. Документы к обновлению

| Документ | Что |
|----------|-----|
| [`functional-requirements.md`](./functional-requirements.md) | Новый **FR-PROF-03a**: шаг аллергенов предлагает быстрый выбор по выбранным типам; полный каталог доступен всегда |
| [`codebase-index.md`](./codebase-index.md) | Новый модуль ядра в списке `Profiles` |
| [`maestro.md`](./maestro.md) | Новый шаг флоу + строка в таблице симптомов |
| [`qa-test-cases.md`](./qa-test-cases.md) | TC на S1–S6 (рядом с TC-045 / TC-046) |
| [`allergy-taxonomy-roadmap.md`](./allergy-taxonomy-roadmap.md) | Follow-up закрыт: [`calendar-pollen-allergen-rows-plan.md`](./calendar-pollen-allergen-rows-plan.md) |
