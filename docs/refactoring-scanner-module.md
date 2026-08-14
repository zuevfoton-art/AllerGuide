# Рефакторинг модуля «Сканер»

## Введение

Цель рефакторинга — сохранить offline-first поток сканера (штрихкод / текст /
OCR / dish-vision), но сделать границы данных и ввода такими же явными, как
после рефакторинга профиля и дневника.

Основные инварианты:

- история сканов и «безопасные» продукты принадлежат только профилям текущего
  пользователя;
- IndexedDB-мутации считаются успешными только после `persistDbWrites()`;
- совпадения в истории хранятся как `{ direct, cross, trace }`, а не как
  слитый массив;
- для штрихкода в `input` пишется сам код, состав — отдельно, чтобы
  `repeatUnsafe` снова работал;
- API `/api/scan` и `/api/scan/intent` отклоняют невалидный payload и
  игнорируют клиентский `prompt`;
- UI не показывает вердикт чужого/устаревшего запроса и не сканирует без
  загруженного профиля.

Затронуты:

- `apps/mobile/src/services/scan-history-service.ts`;
- `apps/mobile/src/services/safe-products-service.ts`;
- `apps/mobile/src/services/alias-feedback-service.ts`;
- `apps/mobile/src/services/scanner-service.ts` (баррель; реализация в `scan-analysis` / `scanner-barcode-service` / `scanner-ocr-service` / `scanner-dish-vision-service`);
- `apps/mobile/src/services/owned-profiles.ts`;
- `apps/mobile/app/(tabs)/scanner.tsx`;
- `apps/mobile/src/db/init.ts` / `web-store.ts`;
- `apps/api/src/routes/scan.ts`, `scan-intent.ts`, новый `scan-input.ts`;
- `packages/core/src/scan-history-matches.ts`.

Не переписывались: VL-first путь фото, алгоритм barcode lookup, LLM-промпты,
`runMockScan` / risk scoring.

## Исходный код

### История писалась без проверки владельца

```ts
export function saveScanHistory(profileId: number, input: string, result: ScanResult) {
  db.runSync(
    'INSERT INTO scan_history (profileId, mode, input, …) VALUES (?, ?, ?, …)',
    [profileId, result.mode, input.trim(), /* … */],
  );
}

export function listScanHistory(profileId: number): ScanHistoryEntry[] {
  return db.getAllSync('SELECT * FROM scan_history WHERE profileId = ? …', [profileId]);
}
```

Локальная БД может содержать профили нескольких аккаунтов. Числового
`profileId` недостаточно.

### Совпадения сливались в один массив

```ts
JSON.stringify([...result.matches, ...result.crossMatches]);
```

При повторном открытии истории UI клал всё в `matches` и обнулял
`crossMatches`. Следы (`traceMatches`) не сохранялись вовсе.

### Успешный штрихкод сохранял состав, а не код

```ts
if (profile) saveScanHistory(profile.id, product.ingredients, result, product.name);
```

`wasBarcodePreviouslyHighRisk(history, barcode)` сравнивает `entry.input === barcode`.
Повторный high-risk почти никогда не срабатывал для найденных продуктов.

### Web-мутации не сбрасывались на диск

`saveJson` только помечал ключ dirty. Как и в дневнике до рефакторинга,
успех в UI не означал, что IndexedDB уже записала историю / safe-list /
alias feedback.

`alias_feedback` на web не имел обработчика в `WebDb.runSync` — INSERT
молча терялся, а экран всё равно показывал «Спасибо».

### API принимал произвольный режим и клиентский prompt

```ts
const mode = body.mode ?? 'product';
const text = body.text?.trim();
const prompt = body.prompt ?? buildScanPrompt(…);
```

Невалидный `mode`, неограниченный текст и подмена промпта попадали в LLM и
в ключ кэша.

### Экран сканировал со stale-профилем и без защиты от гонок

`scanner.tsx` брал `activeProfile` из Zustand. После онбординга или web-reload
id мог быть задан, а объект профиля — нет. Параллельные barcode/OCR ответы
перезаписывали друг друга. Тренды считались по срезу из 5 строк.

## Рефакторинг и объяснение

### 1. Владение профилем вынесено в один helper

`owned-profiles.ts` скрывает запрос `SELECT id FROM profiles WHERE userId = ?`.
История, safe-list и alias feedback используют `isOwnedProfile()` и возвращают
явный `{ ok: false, code }` вместо тихой записи в чужой профиль.

Это information hiding и DRY: три сервиса больше не дублируют SQL владения.

### 2. История хранит структуру совпадений

Новый модуль `@allerguide/core` `scan-history-matches`:

```ts
serializeScanHistoryMatches({
  matches: result.matches,
  crossMatches: result.crossMatches,
  traceMatches: result.traceMatches,
  composition: extras?.composition,
});
```

Чтение понимает и новый объект, и legacy-массив / CSV. `computeScanTrends` и
префилл дневника переведены на общий парсер — старые записи не ломаются.

`historyEntryToScanResult()` убран из экрана в сервис: экран больше не парсит
JSON и не теряет cross/trace.

### 3. Штрихкод снова является ключом истории

Для найденного продукта:

```ts
await saveScanHistory(profile.id, barcode, result, product.name, {
  composition: product.ingredients,
});
```

`input` = штрихкод → `repeatUnsafe` работает. Состав восстанавливается из
`composition` в JSON, поэтому повторное открытие истории по-прежнему показывает
ингредиенты, а не только цифры.

### 4. Мутации ждут `persistDbWrites()`

На web это `flushWebStore()` (явный flush IndexedDB). На native — no-op,
потому что SQLite `runSync` уже закоммичен. Тот же контракт, что у дневника.

В `KNOWN_KEYS` добавлены `ag_safe_products`, `ag_alias_feedback`,
`ag_diary_attachments`, чтобы миграция с localStorage их не теряла.

WebDb получил INSERT/SELECT для `alias_feedback` и DELETE
`safe_products WHERE id = ? AND profileId = ?`.

### 5. API-вход вынесен в `parseScanInput`

Как `parseProfileInput` в модуле профиля:

- `mode` только из `{ product, menu, medicine, cosmetics }`;
- текст ограничен 8000 / 1200 символов;
- аллергены — строки, dedupe, максимум 64;
- клиентский `prompt` игнорируется, сервер всегда строит свой.

Ошибки по-прежнему общие (`Invalid scan payload`, `Scan failed`) — внутренности
LLM не утекают.

### 6. Экран стал тоньше и безопаснее

- `ensureActiveProfileLoaded()` / `getOrLoadActiveProfileId()` на фокусе и
  перед сканом;
- `scanRequestId` отбрасывает устаревший ответ;
- тренды считаются по полной истории, в списке остаются 5 строк;
- «уже в безопасных» учитывает режим, не только текст;
- удаление/сохранение идёт через `confirmAction` (web `confirm`, native
  `Alert`);
- alias feedback показывает «Спасибо» только после `{ ok: true }`.

Тихие `catch` в OCR и dish-lookup теперь логируются через `logCaughtError`.

## Альтернативные решения

### A. Отдельная колонка `barcode` / `matches_json` в SQLite

Плюсы: явная схема, проще SQL-фильтр repeat-risk.
Минусы: миграция v10 на native + расхождение с web JSON; больше поверхности,
чем нужно для bounded-рефакторинга. Структурированный JSON в уже существующей
колонке `matches` даёт обратную совместимость без миграции.

### B. Разрезать `scanner-service.ts` на barcode / ocr / vision оркестраторы

Плюсы: ниже связность, проще тестировать ветки.
Минусы: высокий риск регрессий VL-first пути, который уже покрыт golden /
dish-vision тестами. Для той итерации важнее были границы данных, а не
перестановка pipeline.

Позже сделано без смены поведения: `scan-analysis` / `scanner-barcode-service` /
`scanner-ocr-service` / `scanner-dish-vision-service`, баррель `scanner-service.ts`
(PR #236). VL-first путь и публичный импорт экрана не менялись.

### C. Оставить клиентский `prompt` в кэше «для гибкости»

Плюсы: клиент может экспериментировать с формулировкой.
Минусы: prompt injection и отравление кэша. Серверный `buildScanPrompt` —
единственный источник правды; клиентский prompt больше не участвует в ключе
кэша.

## Побочные эффекты и компромиссы

- Старые записи истории по-прежнему читаются (flat array → `direct`).
  Cross/trace у них восстановить нельзя — данных не было.
- `saveScanHistory` / `addSafeProduct` / `saveAliasFeedback` стали `async`.
  Вызовы без `await` больше некорректны.
- Игнорирование `body.prompt` меняет ключ кэша, если кто-то слал разные
  промпты к одному тексту. Это намеренно: одинаковый текст+аллергены =
  один LLM-вызов.
- `confirmAction` дублирует идею `confirmDestructiveAction` с ветки дневника.
  После merge веток их стоит свести в один utility.

## Заключение

Сканер по-прежнему работает offline: keyword/mock путь не зависит от API.
Изменились границы владения, сериализации, persistence и валидации входа —
те же инварианты, что у профиля и дневника. Pipeline распознавания
(штрихкод → каталог/OFF, VL-first фото, intent, LLM fallback) не
переписывался.
