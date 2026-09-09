# План: строки каталога для «календарных» пыльцевых таксонов

**Статус:** реализовано в этой ветке. Остаётся операционный шаг после merge — тег `catalog-seed-*` и проверка 65/54 в staging.

Лещина, дуб, клён, ясень, ива, тополь и лебеда есть в опциях типа «Поллиноз» и в пыльцевых таксонах (карта + региональный календарь), но строки аллергена в `ALLERGENS` у них нет. Поэтому они не попадают ни в быстрый выбор, ни в полный каталог, ни в пре-сид аллергенов по выбранным опциям.

**Follow-up к:** [`condition-allergen-quick-pick-plan.md`](./condition-allergen-quick-pick-plan.md) §3.2 · [`allergy-taxonomy-roadmap.md`](./allergy-taxonomy-roadmap.md) §2.2 (Phase 4.4)
**Связано:** [`architecture.md`](./architecture.md) · [`development-rules.md`](./development-rules.md) · [`codebase-index.md`](./codebase-index.md) · [`yandex-pollen-map-integration.md`](./yandex-pollen-map-integration.md)

---

## 1. Цель и объём

Завести 7 строк аллергенов, развязать подмену «таксон → чужой allergen id», добавить перекрёсты и клинические кодировки, включить новые id в быстрый выбор поллиноза и пересидировать `catalog.allergens` на staging.

**Входит в объём:**

| # | Блок |
|---|------|
| 1 | 7 строк в `allergen-database.ts` (`category: 'environmental'`) |
| 2 | Развязка `POLLEN_TAXA[].allergenId` + двухуровневое совпадение с профилем (`exact` / `related`) |
| 3 | `CONDITION_OPTION_ALLERGEN_MAP.pollinosis` + удаление `CALENDAR_ONLY_POLLEN_OPTION_IDS` |
| 4 | Быстрый выбор поллиноза: 6 → 13 id + свёртка группы |
| 5 | Перекрёстные реакции — новый `cross-reactions/phase-4.ts` |
| 6 | `ALLERGEN_CLINICAL_CODES` — 7 записей (инвариант 1:1 с каталогом) |
| 7 | `clinical-phenotypes.POLLEN_ALLERGEN_IDS` — расширение для `pollen-food-oas` |
| 8 | Пересид `catalog.allergens` / `catalog.cross_reactions` на staging |

**Не входит:**

- Google-only таксоны (вяз, можжевельник, сосна, кипарисовая сосна, криптомерия, японский кипарис) — у них `allergenId: null` и **нет** опции в `ALLERGY_CONDITION_TYPES.pollinosis`. Нужны ли они в профиле — отдельный продуктовый вопрос.
- Региональные календари `pollen-calendar.ts` — берут `allergenId` из таксономии, править не нужно.
- Пороги `pollen-thresholds.ts` — для всех 7 таксонов уже заданы.
- i18n-словарь имён аллергенов: в архитектуре его нет, `name` в каталоге RU-only для всех 58 строк. Отдельная задача, не смешивать.

---

## 2. Baseline (проверено в коде)

| Факт | Значение |
|------|----------|
| `ALLERGENS` | **58** строк: food 32 · environmental 16 · medication 5 · insect 5 |
| `CROSS_REACTIONS` | **47** пар (phase-1 25 · phase-2 18 · phase-3 4) |
| `ALLERGEN_CLINICAL_CODES` | 1:1 с каталогом — закреплено тестом `clinical-coding.test.ts` |
| Таксоны карты | `POLLEN_MAP_TAXON_IDS` = 17 (6 Open-Meteo + 11 Google plant codes) |
| Быстрый выбор поллиноза | 6 id в `CONDITION_RECOMMENDED_ALLERGEN_IDS.pollinosis` |

### 2.1. Текущая подмена id

`POLLEN_TAXA` (`packages/core/src/pollen-taxonomy.ts`):

| Таксон | Опция типа | `allergenId` сейчас | На карте | В календаре | Порог |
|--------|-----------|---------------------|----------|-------------|-------|
| `hazel_pollen` | Лещина | **`hazelnut`** (еда!) | да (`HAZEL`) | нет | да |
| `oak_pollen` | Дуб | `birch-pollen` | да (`OAK`) | да (Москва, СПб) | да |
| `maple_pollen` | Клён | `birch-pollen` | да (`MAPLE`) | нет | да |
| `ash_pollen` | Ясень | `birch-pollen` | да (`ASH`) | нет | да |
| `willow_pollen` | Ива | `birch-pollen` | нет | нет | да |
| `poplar_pollen` | Тополь | `birch-pollen` | да (`COTTONWOOD`) | нет | да |
| `saltwort_pollen` | Лебеда | `mugwort-pollen` | нет | нет | да |

### 2.2. Три следствия подмены

1. **Профиль.** В `AllergenPicker` (и в чипах, и в полном каталоге) этих аллергенов нет — пользователь с аллергией на пыльцу дуба вынужден выбрать «Пыльцу берёзы».
2. **Пре-сид.** `resolveConditionOptionAllergenId('pollinosis', 'oak')` → `null`, поэтому выбор опции «Дуб» на шаге типов не добавляет ничего в `profiles.allergies` (в отличие от «Ольхи» и «Оливы»).
3. **Карточка растения на карте.** `buildPollenPlantDetail` берёт перекрёсты по `taxon.allergenId`, поэтому карточка дуба, клёна, ясеня и тополя показывает перекрёсты **берёзы**, а карточка лещины — перекрёсты **фундука**. Для лещины это прямая ошибка: пыльца лещины и фундук — разные аллергены, между ними перекрёст (Cor a 1), а не тождество.

### 2.3. Замер на текущем `main`

Прогон по реальному коду (`vitest`, `packages/core`), а не чтение файлов:

```
ALLERGENS: 58 {"food":32,"environmental":16,"medication":5,"insect":5}
CROSS_REACTIONS: 47
ALLERGEN_CLINICAL_CODES: 58
pollinosis quick-pick: 6 birch-pollen, alder-pollen, grass-pollen, mugwort-pollen, ragweed-pollen, olive-pollen

hazel_pollen     allergenId=hazelnut       hazelnutProfileMatches=true
oak_pollen       allergenId=birch-pollen   birchProfileMatches=true
maple_pollen     allergenId=birch-pollen   birchProfileMatches=true
ash_pollen       allergenId=birch-pollen   birchProfileMatches=true
willow_pollen    allergenId=birch-pollen   birchProfileMatches=true
poplar_pollen    allergenId=birch-pollen   birchProfileMatches=true
saltwort_pollen  allergenId=mugwort-pollen mugwortProfileMatches=true

option hazel/oak/maple/ash/willow/poplar/saltwort -> allergenId=null    # пре-сида нет

oak_pollen   card cross-reactions: Яблоко, Фундук, Морковь, Сельдерей, Соя, Арахис, Пыльца полыни, Томаты, Киви
maple_pollen card cross-reactions: Яблоко, Фундук, Морковь, Сельдерей, Соя, Арахис, Пыльца полыни, Томаты, Киви
hazel_pollen card cross-reactions: Пыльца берёзы, Орехи, Арахис

mugwort snomed: 418689008        # тот же код, что у grass-pollen — дефект
grass   snomed: 418689008
inferConditionIdsFromAllergies(['Слива']): pollinosis, rhinitis     # дефект POLLEN_PATTERN
```

Карточка клёна показывает **перекрёсты берёзы вплоть до фундука и сельдерея** — это и есть цена подмены id, и одновременно причина, почему §6 (перекрёсты) обязателен вместе со строками каталога.

---

## 3. Решение №1: точный id + «родственное» совпадение

Как только у таксона появится своя строка, профиль «только берёза» перестанет подсвечивать дуб на карте и в календаре — сегодня это работает именно из-за подмены. Без компенсации это регресс.

Поэтому вводим два уровня совпадения в `pollen-taxonomy.ts`:

```ts
export interface PollenTaxon {
  id: PollenTaxonId;
  /** Точный id каталога (теперь свой у 7 таксонов). */
  allergenId: ProfileAllergenId | null;
  /** Ботанически обоснованный fallback: профиль с этим id считается чувствительным «по родству». */
  relatedAllergenIds?: ProfileAllergenId[];
  labelRu: string;
  openMeteoHourlyKey?: OpenMeteoPollenTaxonId;
}

export type PollenTaxonMatchKind = 'exact' | 'related' | 'none';

export function resolvePollenTaxonMatch(
  profileAllergenIds: ProfileAllergenId[],
  taxonId: PollenTaxonId,
): PollenTaxonMatchKind;
```

`profileMatchesPollenTaxon` остаётся boolean-обёрткой (`match !== 'none'`) — существующие потребители и их тесты не меняются, а UI получает возможность отличать «ваш аллерген» от «родственная пыльца».

### 3.1. Таблица родства

`related` заводим **только** там, где есть таксономическое основание:

| Таксон | `allergenId` | `relatedAllergenIds` | Основание |
|--------|--------------|----------------------|-----------|
| `hazel_pollen` | `hazel-pollen` | `birch-pollen` | Betulaceae; Cor a 1 — гомолог Bet v 1 (PR-10) |
| `oak_pollen` | `oak-pollen` | `birch-pollen` | Fagales; PR-10 гомология |
| `ash_pollen` | `ash-pollen` | `olive-pollen` | Oleaceae; Fra e 1 — гомолог Ole e 1 |
| `maple_pollen` | `maple-pollen` | — | Sapindaceae; гомологии с берёзой нет |
| `willow_pollen` | `willow-pollen` | — | Salicaceae; гомологии с берёзой нет |
| `poplar_pollen` | `poplar-pollen` | — | Salicaceae; то же |
| `saltwort_pollen` | `saltwort-pollen` | — | Amaranthaceae; связь с полынью — через паналлергены, это перекрёст, а не родство |

Итог: для лещины, дуба и ясеня поведение существующих профилей сохраняется (и становится точнее — ясень теперь тянется к оливе, а не к берёзе); для клёна, ивы, тополя и лебеды подмена снимается осознанно (§13).

### 3.2. Потребители, которых надо перевести на общий хелпер

| Файл | Сейчас | Нужно |
|------|--------|-------|
| `apps/mobile/src/services/pollen-map-service.ts` | `profileAllergenIds.includes(reading.allergenId)` | `resolvePollenTaxonMatch` по `reading.taxonId` |
| `packages/core/src/pollen-calendar.ts` | `getPollenTaxon(taxonId)?.allergenId` + `profileMatchesPollenTaxon` | без изменений (обёртка сохраняет поведение) |
| `packages/core/src/wellness.ts`, `pollen-reminder.ts` | работают только по 6 Open-Meteo-таксонам | без изменений — новых id не видят |
| `MapAllergenChips`, `MapPollenAllergenModal`, `MapPollenStatusCard`, `PollenMapLayer` | boolean `profileRelevant` | опционально: показать `related` мягче, чем `exact` (можно вынести отдельным шагом) |

---

## 4. Данные: 7 новых строк каталога

`category: 'environmental'`, `popular: false` — блок «Частые аллергены» (fallback S4 быстрого выбора) не меняется.

| id | `name` | `keywords` |
|----|--------|-----------|
| `hazel-pollen` | Пыльца лещины | `лещин`, `орешник` |
| `oak-pollen` | Пыльца дуба | `пыльца дуба`, `дубов` |
| `maple-pollen` | Пыльца клёна | `клён`, `клен` |
| `ash-pollen` | Пыльца ясеня | `ясен` |
| `willow-pollen` | Пыльца ивы | `пыльца ивы`, `ивов`, `верб` |
| `poplar-pollen` | Пыльца тополя | `топол` |
| `saltwort-pollen` | Пыльца лебеды | `лебед` |

### 4.1. Ловушки в `keywords`

`keywords` матчатся подстрокой (`lower.includes(keyword)`), поэтому короткие стемы опасны:

- **`ива` использовать нельзя** — `'слива'.includes('ива') === true`. Отсюда `пыльца ивы` / `ивов`.
- **`дуб` использовать нельзя** — совпадёт с «дубильные вещества» в составе. Отсюда `пыльца дуба` / `дубов`.
- `лещин` намеренно дублирует keyword пищевой строки `hazelnut` («лещина»). Коллизия безопасна: `food-drug-allergy.ts` и `insect-allergy.ts` фильтруют каталог по `category`, а пищевой матчер до `environmental` строк не доходит. Проверить только поиск в `AllergenCatalogModal` (там дубль по запросу «лещина» ожидаем и полезен).

**Побочная находка (починить в том же проходе).** `diary-profile.ts` → `POLLEN_PATTERN` содержит `|ива|`, поэтому `inferConditionIdsFromAllergies(['Слива'])` уже сейчас выводит `pollinosis` + `rhinitis`. Заменить на `\bивы?\b|ивов` и закрыть тестом.

---

## 5. Решение №2: быстрый выбор поллиноза

### 5.1. Жёсткая связка с инвариантом

`condition-allergen-recommendations.test.ts` содержит инвариант «рекомендации не противоречат `CONDITION_OPTION_ALLERGEN_MAP`»: каждый allergen id из маппинга опций **обязан** быть в `CONDITION_RECOMMENDED_ALLERGEN_IDS` того же типа. Значит, как только 7 опций начнут резолвиться в id, чипов поллиноза станет 13.

Инвариант оставляем как есть — он ценен (не даёт пре-сидить аллерген, которого нет в быстром выборе). Компенсируем длину свёрткой группы.

### 5.2. Порядок id

Существующие 6 сохраняют порядок, новые дописываются по клинической значимости:

```ts
pollinosis: [
  'birch-pollen', 'alder-pollen', 'grass-pollen', 'mugwort-pollen', 'ragweed-pollen', 'olive-pollen',
  'hazel-pollen', 'oak-pollen', 'ash-pollen', 'saltwort-pollen', 'maple-pollen', 'poplar-pollen', 'willow-pollen',
],
```

### 5.3. Свёртка группы

Риск «список на 3+ типах слишком длинный» уже зафиксирован в [`condition-allergen-quick-pick-plan.md`](./condition-allergen-quick-pick-plan.md) §7 — закрываем его здесь.

| Слой | Изменение |
|------|-----------|
| `allergen-recommendation-display.ts` | В группу добавить `visibleAllergens` / `hiddenCount` при `visibleLimit = 8`; выбранные аллергены **всегда** видимы (иначе выбор «спрячется») |
| `AllergenPicker` | Кнопка «Показать ещё N» на группу; после раскрытия состояние держится локально, между шагами не сохраняется |
| i18n (`types.ts` + 6 локалей) | Новый ключ `allergens.showMore` (RU: «Показать ещё {{count}}») |
| testID | `allergen-show-more-${conditionId}`; `allergen-${id}` не переименовывать (от него зависят Maestro-флоу) |

Видимые 8 при поллинозе: берёза, ольха, злаки, полынь, амброзия, олива, лещина, дуб. Под свёрткой: ясень, лебеда, клён, тополь, ива. Регресса для текущих чипов нет.

---

## 6. Перекрёстные реакции — `cross-reactions/phase-4.ts`

Это **не** косметика: после развязки id карточка растения на карте (`buildPollenPlantDetail`) начнёт брать перекрёсты по новому id, и без новых пар дуб/клён/ясень/тополь потеряют содержимое блока перекрёстов, а лещина — связь с фундуком. Поэтому блок P0, вместе со строками каталога.

Фазы `cross-reactions/*` append-only, направление одно (`getCrossReactionsFor` матчит и `fromId`, и `toId`).

| `fromId` | `toId` | `risk` | `protein` | `syndrome` | Смысл |
|----------|--------|--------|-----------|------------|-------|
| `hazel-pollen` | `birch-pollen` | high | `Cor a 1 / Bet v 1` | — | Betulaceae, гомологичные PR-10 |
| `hazel-pollen` | `hazelnut` | high | `Cor a 1` | `oas` | Пыльца лещины ↔ фундук, OAS |
| `oak-pollen` | `birch-pollen` | medium | `PR-10 (Que a 1 / Bet v 1)` | — | Fagales |
| `ash-pollen` | `olive-pollen` | high | `Fra e 1 / Ole e 1` | — | Oleaceae |
| `saltwort-pollen` | `mugwort-pollen` | medium | профилин | — | Сорные травы, паналлергены |
| `saltwort-pollen` | `ragweed-pollen` | low | — | — | Совместная сенсибилизация поздним летом |
| `poplar-pollen` | `willow-pollen` | low | — | — | Salicaceae; «тополиный пух» — переносчик пыльцы других растений, а не аллерген |

`CROSS_REACTIONS`: 47 → 54. Тест `CROSS_REACTIONS.length >= 40` остаётся зелёным.

**Клён остаётся без пар осознанно** — устойчивой гомологии в литературе нет, выдумывать нельзя. Проверить, что карточка растения и блок перекрёстов в `AllergenPicker` корректно рендерятся при пустом списке (`crossReactionLabels: []`).

---

## 7. Клинические кодировки

`clinical-coding.test.ts` требует запись для **каждой** строки каталога и точное равенство размеров — без 7 записей сборка красная.

- ICD-11 для всех семи: `CA08.4` (Allergic rhinitis due to pollen), как у остальных пыльцевых.
- SNOMED: **не выдумывать**. На этапе реализации проверить концепты в SNOMED CT browser («Allergy to oak pollen», «Allergy to hazel pollen», …); если конкретный концепт не подтверждается — брать родительский концепт пыльцевой аллергии и помечать это в `snomedLabel`.

**Побочная находка.** У `mugwort-pollen` сейчас `snomed: '418689008'` — тот же код, что у `grass-pollen` («Allergy to grass pollen»). Явная ошибка: исправить в том же проходе на проверенный концепт полыни.

---

## 8. Фенотипы и остальные потребители

| Файл | Действие |
|------|----------|
| `clinical-phenotypes.ts` | `POLLEN_ALLERGEN_IDS` сейчас 4 id (birch/grass/ragweed/mugwort) — без него `pollen-food-oas` не увидит новую пару лещина ↔ фундук. Добавить 7 новых **и** пропущенные `alder-pollen` / `olive-pollen`; лучше собрать set из каталога по `id.endsWith('-pollen')`, чтобы не забыть при следующем расширении |
| `profile-capabilities.ts` | `profileHasAnyPollenAllergen` уже включает `id.endsWith('-pollen')` — новые id подхватятся, `reminders.pollen` и ASIT-гейтинг не менять |
| `diary-profile.ts` | `POLLEN_PATTERN` уже содержит `лещин`, `клён`, `ясень`, `топол` → `pollinosis` + `rhinitis` выводятся автоматически (см. правку `ива` в §4.1) |
| `pollen-plant-detail.ts` | `GOOGLE_PLANT_CODE_TO_TAXON` не менять; перекрёсты подтянутся из phase-4 |
| `pollen-map.ts`, `pollen-thresholds.ts`, `pollen-google-*.ts` | Не менять — работают по taxon id |
| `regulatory-allergens.ts`, `allergen-aliases.ts`, `inci-allergens.ts`, `scan-risk.ts`, `marketplace-catalog.ts`, `doctor-report.ts`, `allergy-passport.ts` | Не менять — либо food-only, либо резолвят каталог динамически |
| `apps/mobile/src/constants/pollen-taxon-labels.ts` | Не менять; `map.pollenOak` / `pollenHazel` / `pollenMaple` / `pollenAsh` / `pollenPoplar` уже переведены на 6 локалей (у ивы и лебеды таксона карты нет) |

---

## 9. API и staging БД

| Компонент | Действие |
|-----------|----------|
| `apps/api/src/db/catalog-schema.ts`, `apps/api/sql/catalog.sql` | Не менять — схема generic (`id`/`name`/`category`/`popular`/`keywords`), FK на `cross_reactions` нет |
| Drizzle-миграция | **Не нужна** — новых колонок и таблиц нет |
| `db:seed-allergens` | Идемпотентный upsert из `@allerguide/core`; после мержа прогнать заново |
| `.github/workflows/seed-staging-catalog.yml` | Триггер тегом `catalog-seed-*` (`workflow_dispatch` из этой интеграции часто отдаёт 403); порядок в workflow уже правильный — аллергены до перекрёстов |
| `GET /api/allergens` | Без изменений: отдаёт БД, при её отсутствии — статический каталог из core |

Проверка после сида: `select count(*) from catalog.allergens` → 65; `select count(*) from catalog.cross_reactions` → 54.

---

## 10. Карта изменений по файлам

| Приоритет | Файл | Действие |
|-----------|------|----------|
| P0 | `packages/core/src/allergen-database.ts` | +7 `AllergenRecord` |
| P0 | `packages/core/src/pollen-taxonomy.ts` | `relatedAllergenIds`, `resolvePollenTaxonMatch`, перепривязка 7 `allergenId` |
| P0 | `packages/core/src/condition-allergen-map.ts` | +7 в `CONDITION_OPTION_ALLERGEN_MAP.pollinosis`; удалить `CALENDAR_ONLY_POLLEN_OPTION_IDS` + `isCalendarOnlyPollenOption` (потребителей вне собственного теста нет; экспортируются из barrel — фиксируем как удаление публичного API пакета) |
| P0 | `packages/core/src/condition-allergen-recommendations.ts` | Поллиноз 6 → 13 id |
| P0 | `packages/core/src/cross-reactions/phase-4.ts` (новый) + `index.ts` | 7 пар |
| P0 | `packages/core/src/clinical-coding.ts` | +7 записей, фикс SNOMED полыни |
| P1 | `packages/core/src/clinical-phenotypes.ts` | `POLLEN_ALLERGEN_IDS` из каталога |
| P1 | `packages/core/src/diary-profile.ts` | `POLLEN_PATTERN`: `ива` → `\bивы?\b|ивов` |
| P1 | `apps/mobile/src/services/allergen-recommendation-display.ts` | `visibleLimit` / `hiddenCount`, выбранные всегда видимы |
| P1 | `apps/mobile/src/components/AllergenPicker.tsx` | «Показать ещё N» + testID |
| P1 | `apps/mobile/src/i18n/types.ts` + `locales/{ru,en,es,fr,de,it}.ts` | `allergens.showMore` |
| P1 | `apps/mobile/src/services/pollen-map-service.ts` | `resolvePollenTaxonMatch` вместо `includes` |
| P2 | Тесты (§11) | Обновить ожидания + новые кейсы |
| P2 | Документы (§15) | Числа каталога и §2.2 роадмапа |
| P2 | `catalog-seed-*` тег | Пересид staging |

---

## 11. Тесты

### 11.1. Сломаются — обновить ожидания

| Файл | Что именно |
|------|------------|
| `clinical-coding.test.ts` | Инвариант 1:1 → нужны 7 новых кодов |
| `condition-allergen-recommendations.test.ts` | Кейс S1 жёстко ждёт список из 6 id → 13; инвариант «не противоречит маппингу» станет требовать новые id |
| `condition-allergen-map.test.ts` | `isCalendarOnlyPollenOption('oak')` — тест удаляется вместе с хелпером; добавить `resolveConditionOptionAllergenId('pollinosis', 'oak') === 'oak-pollen'` и т.д. для всех 7 |
| `pollen-taxonomy.test.ts` | `profileMatchesPollenTaxon(['birch-pollen'], 'oak_pollen')` остаётся `true` (теперь через `related`) — добавить проверку, что это именно `'related'`, а `['oak-pollen']` даёт `'exact'` |

### 11.2. Новые кейсы

- `pollen-taxonomy.test.ts`: `resolvePollenTaxonMatch` — exact / related / none по таблице §3.1; профиль `['hazelnut']` больше **не** матчит `hazel_pollen`.
- `allergen-database.test.ts`: у каждой строки `category: 'environmental'` с id на `-pollen` есть keywords; ни один keyword короче 4 символов (защита от `ива` / `дуб`).
- `cross-reactions`: инвариант «оба id каждой пары есть в `ALLERGENS`» — его сейчас **нет**, `toMatch` молча отбрасывает неизвестные id. Завести здесь.
- `condition-option-selections.test.ts`: выбор опций `['oak','hazel']` пре-сидит `['oak-pollen','hazel-pollen']`.
- `allergen-recommendation-display.test.ts`: при `visibleLimit = 8` поллиноз даёт 8 видимых + `hiddenCount: 5`; выбранный `willow-pollen` попадает в видимые.
- `pollen-map-service.test.ts`: профиль `['birch-pollen']` — дуб `related`, клён `none`.
- `clinical-phenotypes.test.ts`: профиль `['hazel-pollen','hazelnut']` + типы `['pollinosis','food']` → `pollen-food-oas`.
- `diary-profile.test.ts`: `inferConditionIdsFromAllergies(['Слива'])` не содержит `pollinosis`.

### 11.3. Maestro

`profile-pollinosis-quick-pick.yaml` проверяет `allergen-birch-pollen` — берёза остаётся в видимых 8, флоу не ломается. Добавить шаг: тап `allergen-show-more-pollinosis` → виден `allergen-poplar-pollen`; инвариант в `scripts/maestro-ci-check.test.mjs`.

### 11.4. Гейты

`pnpm typecheck` · `pnpm test` · `pnpm --filter mobile lint` · `pnpm rc-gate`. Аналитика: имена событий не добавляются, `check:analytics-taxonomy` не затрагивается (`recommended_count` / `catalog_count` уже считаются от рекомендаций и вырастут — ожидаемо).

---

## 12. Этапы

| Этап | Объём | Проверка |
|------|-------|----------|
| P1 | Ядро данных: 7 строк каталога + 7 клинических кодировок + фикс SNOMED полыни. UI и таксономия не тронуты | `pnpm --filter @allerguide/core test` |
| P2 | Таксономия: `relatedAllergenIds` + `resolvePollenTaxonMatch` + перепривязка 7 `allergenId`; `pollen-map-service` на хелпер | core + `pnpm --filter mobile test` |
| P3 | `phase-4.ts` перекрёсты + инвариант id + `clinical-phenotypes` | core test |
| P4 | Маппинг опций, быстрый выбор 13 id, свёртка группы, i18n 6 локалей, testID | `pnpm typecheck`, `pnpm --filter mobile lint`, mobile test |
| P5 | Maestro-шаг, документы (§15), пересид staging тегом `catalog-seed-*` | `pnpm rc-gate`, счётчики в БД |

Каждый этап — отдельный коммит. P1 и P3 обратимы и не меняют поведение UI.

---

## 13. Совместимость: что изменится у существующих профилей

Данные пользователей **не миграруются**: ни один профиль не мог хранить новые id, а старая подмена жила только в рантайме сопоставления. Опция «Дуб» и раньше ничего не пре-сидила (§2.2), поэтому переписывать `profiles.allergies` не нужно.

| Профиль | Сейчас | После | Оценка |
|---------|--------|-------|--------|
| `birch-pollen` | дуб, клён, ясень, ива, тополь — «ваш аллерген» | дуб — `related`, ясень — через оливу; клён, ива, тополь — не подсвечиваются | Осознанное уточнение; ива и тополь — слабые аллергены, «пух» вообще переносчик, а не аллерген |
| `mugwort-pollen` | лебеда — «ваш аллерген» | лебеда не подсвечивается; связь остаётся перекрёстом (§6) | Осознанно; лебеду теперь можно выбрать точно |
| `hazelnut` (еда) | пыльца лещины — «ваш аллерген» | не подсвечивается; связь — перекрёст Cor a 1 | Исправление ошибки |
| Новый профиль | Дуб на шаге типов ничего не добавлял | Пре-сидит `oak-pollen` | Целевое поведение FR-PROF-03 |

Смягчение регресса для клёна / ивы / тополя / лебеды: карточки этих растений на карте и в календаре остаются доступны всем, а в подсказке «Добавить тип» уже работает `getMissingConditionsForAllergens`. Отдельно стоит показать в `MapPollenAllergenModal` мягкую подсказку «добавьте в профиль», когда таксон не совпал ни точно, ни по родству — но это следующий шаг, не блокер.

---

## 14. Риски

| Риск | Митигация |
|------|-----------|
| Короткий keyword ловит слово из состава (`ива` → «слива», `дуб` → «дубильные») | Стемы из §4.1 + тест на минимальную длину keyword; заодно правка `POLLEN_PATTERN` |
| Инвариант «рекомендации ⊇ маппинг» раздувает группу поллиноза до 13 чипов | Свёртка `visibleLimit = 8`, существующие 6 остаются видимыми |
| Карточка клёна без перекрёстов выглядит пустой | Проверить рендер пустого блока; пары не выдумывать |
| Невозможно подтвердить SNOMED-концепт | ICD-11 `CA08.4` обязателен, SNOMED — только проверенный или родительский концепт с честным `snomedLabel` |
| Staging забыли пересидировать — каталог с бэкенда без новых id | `getRecommendedAllergensForConditions` фильтрует по каталогу и падает на fallback; тег `catalog-seed-*` в чеклисте релиза |
| Удаление `isCalendarOnlyPollenOption` из barrel | Потребителей вне собственного теста нет — проверено grep по репозиторию; фиксируем в PR-описании |
| Регресс подсветки у профилей «только берёза» | Таблица §13 в QA-чеклист; `related` сохраняет дуб, лещину и (через оливу) ясень |

---

## 15. Документы к обновлению

| Документ | Что |
|----------|-----|
| [`allergy-taxonomy-roadmap.md`](./allergy-taxonomy-roadmap.md) | §2.2: закрыть пробел «Поллиноз: 16 option vs 6 pollen rows»; §1 «45 id в каталоге» → фактическое число (58 сейчас, 65 после); «24 аллергена без crosswalk» устарело (Phase 4.5 done) |
| [`condition-allergen-quick-pick-plan.md`](./condition-allergen-quick-pick-plan.md) | §3.2: снять оговорку «пыльца без строки каталога»; §7: риск длинного списка закрыт свёрткой |
| [`functional-requirements.md`](./functional-requirements.md) | FR-PROF-03a: быстрый выбор поллиноза покрывает все опции типа; свёртка группы |
| [`codebase-index.md`](./codebase-index.md) | `cross-reactions/phase-4.ts`, `resolvePollenTaxonMatch` |
| [`qa-test-cases.md`](./qa-test-cases.md) | TC на выбор дуба/лещины, свёртку группы и таблицу совместимости §13 |
| [`qa-checklist.md`](./qa-checklist.md) | Пункт «после мержа — тег `catalog-seed-*`, проверить 65/54 в staging» |
| [`maestro.md`](./maestro.md) | Новый шаг в `profile-pollinosis-quick-pick.yaml` |
| `doc/clinical-wellness-and-diary-ru.md` (+ `.html`) | «46 аллергенов» → фактическое число (4 места), «44 направленные пары» → 54, таблица environmental дополняется 7 строками (там уже нет alder/olive) |
