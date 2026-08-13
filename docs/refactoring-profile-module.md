# Рефакторинг модуля профилей

## Введение

Цель рефакторинга — усилить границы модуля профилей без изменения его
offline-first архитектуры:

- операции над локальными профилями ограничиваются текущим пользователем;
- одинаковые данные сохраняются одинаково в SQLite и IndexedDB;
- API не приводит ошибочные значения к «правильным» молча;
- HTTP-маршруты отвечают только за transport concerns, а парсинг вынесен в
  тестируемый модуль;
- клиент не получает внутренние сообщения БД.

Затронуты:

- `apps/mobile/src/services/profile-service.ts`;
- `apps/mobile/src/services/backend-api.ts`;
- `apps/mobile/src/db/init.ts`;
- `apps/mobile/src/utils/confirm-delete-profile.ts`;
- `apps/api/src/routes/profiles.ts`;
- новый parser `apps/api/src/routes/profile-input.ts`;
- регрессионные тесты mobile/API.

## Исходный код

### Локальные операции не проверяли владельца

```ts
db.runSync(
  'UPDATE profiles SET ... WHERE id = ?',
  [...values, id],
);

db.runSync('DELETE FROM profiles WHERE id = ?', [id]);
```

В одной локальной БД могут находиться профили нескольких локальных
пользователей. Проверка только `id` позволяла изменить или удалить чужой
профиль после переключения аккаунта.

### Web-адаптер терял часть модели

```ts
profiles.push({
  id,
  userId: params![0] as number,
  name: params![1] as string,
  // ...
  allergyConfirmations: params![5] as string,
});
```

SQL передавал `crossReactionAllergies` седьмым параметром, но `WebDb` его не
сохранял. Поэтому одна и та же операция давала разные результаты на native и
web.

### API дублировал небезопасный разбор тела

```ts
const input = {
  name: body.name.trim(),
  birthYear: Number(body.birthYear) || new Date().getFullYear(),
  type: body.type,
  allergies: body.allergies,
};
```

Код повторялся в `POST` и `PATCH`. Строка `"1990"` принималась как число, а
ошибочные `0`, `NaN` или отсутствующее значение незаметно заменялись текущим
годом.

## Рефакторинг и объяснение

### 1. Явная нормализованная модель сохранения

В `profile-service.ts` введён внутренний `NormalizedProfilePayload`.

```ts
type NormalizedProfilePayload = {
  name: string;
  allergenIds: string[];
  allergiesJson: string;
  allergyConfirmationsJson: string;
  crossReactionAllergiesJson: string;
};
```

Теперь одна функция:

- обрезает пробелы в имени;
- приводит primary и cross-reaction аллергены к каноническим id;
- удаляет дубликаты;
- синхронизирует confirmations с актуальным списком аллергенов;
- сериализует поля один раз.

Это применение **Information Hiding**: формат хранения скрыт от create/update.

### 2. Защита локальных операций по `userId`

Запросы чтения, изменения и удаления используют составной предикат:

```ts
const profile = db.getFirstSync<Profile>(
  'SELECT * FROM profiles WHERE id = ? AND userId = ?',
  [id, userId],
);
```

`updateProfile` и `deleteProfile` применяют ту же проверку. Если профиль не
принадлежит текущему пользователю, операция не меняет данные.

Сервер уже использовал `WHERE profile.id = ? AND profile.user_id = ?`; теперь
offline и backend пути имеют одинаковый security invariant.

### 3. Удаление зависимых вложений

До удаления дневника сервис получает id его записей и удаляет
`diary_attachments`. Раньше файлы-вложения оставались сиротами после удаления
профиля.

Порядок важен:

```ts
for (const entry of diaryEntries) {
  db.runSync('DELETE FROM diary_attachments WHERE entryId = ?', [entry.id]);
}
db.runSync('DELETE FROM diary_entries WHERE profileId = ?', [profileId]);
```

Это сохраняет возможность найти вложения до удаления родительских записей.

### 4. Паритет SQLite и IndexedDB

`WebDb` теперь:

- сохраняет `crossReactionAllergies` при insert/upsert/update;
- учитывает `userId` в select/update/delete;
- ищет последний созданный профиль только среди профилей текущего
  пользователя;
- сохраняет локальные cross-reactions при backend refresh, если сервер пока не
  вернул это поле.

Последний пункт — осознанный компромисс. В текущей Postgres-схеме поля
`cross_reaction_allergies` нет, поэтому mobile сохраняет его локально, не
притворяясь, что сервер уже стал источником истины для этого поля.

### 5. Типобезопасный parser API

Transport parsing вынесен в `profile-input.ts`:

```ts
export function parseProfileInput(body: unknown): ProfileInput | null;
export function parseProfileId(rawId: string): number | null;
```

Parser проверяет:

- plain object вместо произвольного значения;
- непустое имя;
- целый `birthYear` типа `number`;
- допустимые `type` и `scenario`;
- массивы только из строк;
- допустимые источники подтверждения аллергии;
- положительный safe integer для id.

Так route остаётся тонким, а parser тестируется без Express и БД
(**Single Responsibility Principle**).

### 6. Рабочее подтверждение удаления на web

Ручной тест выявил, что реализация `Alert.alert()` в `react-native-web` является
no-op: callback destructive-кнопки не вызывается. Confirmation вынесен в
`confirm-delete-profile.ts`:

```ts
if (Platform.OS === 'web') {
  if (window.confirm(`${title}\n\n${message}`)) {
    void onConfirm();
  }
  return;
}

Alert.alert(title, message, nativeButtons);
```

Web использует нативный browser confirm, а iOS/Android сохраняют привычный
destructive `Alert`. Utility покрыт тестами confirm/cancel/native.

### 7. DRY в HTTP-маршрутах

Одинаковый код POST/PATCH заменён вызовом `parseProfileInput`. Проверка id
выполняется через `readProfileId`, а unexpected errors — через
`sendUnexpectedError`.

Внутренние сообщения исключений больше не возвращаются клиенту:

```ts
logCaughtError(context, error);
res.status(500).json({ ok: false, error: 'Profile operation failed' });
```

Это уменьшает риск раскрытия SQL, структуры БД или деталей конфигурации.

### 8. Тестируемость

Добавлены тесты для:

- отклонения malformed id и payload;
- отсутствия неявного coercion `birthYear`;
- сокрытия внутренних ошибок API;
- передачи authenticated `userId` в delete;
- запрета read/update/delete чужого локального профиля;
- нормализации имени и cross-reaction аллергенов;
- удаления вложений до записей дневника;
- одинакового сохранения полей в `WebDb`.
- web/native подтверждения удаления профиля.

## Возможные побочные эффекты и компромиссы

1. API теперь отклоняет `birthYear: "1990"`. Клиент уже отправляет число, но
   сторонним интеграциям нужно соблюдать контракт.
2. Unexpected service errors теперь дают HTTP 500 вместо 400. Это корректнее:
   400 остаётся для проверенной ошибки клиента, 500 — для сбоя сервиса/БД.
3. Удаление профиля выполняет дополнительные запросы по вложениям. Их число
   линейно количеству записей дневника. Для локальной БД это приемлемо; при
   большом объёме лучше включить foreign keys с `ON DELETE CASCADE`.
4. Cross-reaction данные пока не синхронизируются через Postgres. Рефакторинг
   предотвращает локальную потерю, но полноценная cross-device синхронизация
   требует отдельной серверной миграции.

## Альтернативные решения

### Альтернатива 1: Repository pattern

Создать `ProfileRepository` с реализациями `SQLiteProfileRepository`,
`WebProfileRepository` и `PostgresProfileRepository`.

Плюсы:

- SQL и IndexedDB детали полностью скрыты от сервисов;
- проще unit-тестировать orchestration через fake repository;
- единый контракт для ownership и каскадов.

Минусы:

- большой diff и риск регрессии во всех profile flows;
- дополнительная абстракция поверх небольшого приложения;
- переход потребует постепенно заменить текущий `DbLike`.

### Альтернатива 2: Общая runtime-схема (Zod / Valibot)

Определить profile schema в `packages/core` и использовать её на mobile/API.

Плюсы:

- единый runtime contract;
- меньше ручных type guards;
- удобные structured validation errors.

Минусы:

- новая dependency и рост bundle;
- migration затрагивает остальные формы;
- доменная валидация и transport parsing могут случайно слиться в один слой.

Для текущего scope выбран нативный TypeScript parser: он мал, не добавляет
зависимостей и сохраняет границу между HTTP и доменом.

## Заключение

Рефакторинг уменьшает дублирование и выравнивает поведение mobile web/native и
API. Главный результат — явные инварианты владения профилем и сохранения всех
полей. Следующий самостоятельный шаг — добавить
`cross_reaction_allergies` в Postgres через versioned Drizzle migration, если
cross-device синхронизация этого поля становится продуктовым требованием.
