# Рефакторинг модуля «Дневник»

## Введение

Цель рефакторинга — сохранить offline-first поведение дневника, но сделать
границы данных явными и одинаковыми для SQLite и IndexedDB.

Основные инварианты:

- пользователь может читать и менять записи только своих профилей;
- update/delete проверяют одновременно `entryId` и `profileId`;
- ошибки мутаций не закрывают editor как будто сохранение прошло успешно;
- удаление подтверждается и на web, и на native;
- подготовка новых фото завершается до удаления старых;
- `diary-service` отвечает за дневник, а не за PDF-отчёты.

Затронуты:

- `apps/mobile/src/services/diary-service.ts`;
- `apps/mobile/src/services/diary-attachment-service.ts`;
- `apps/mobile/src/db/init.ts`;
- `apps/mobile/app/(tabs)/diary.tsx`;
- новый utility `confirm-destructive-action.ts`;
- регрессионные тесты mobile/WebDb.

## Исходный код

### Мутации выполнялись только по глобальному `id`

```ts
db.runSync('UPDATE diary_entries SET type = ?, details = ? WHERE id = ?', [
  input.type,
  input.details,
  id,
]);

db.runSync('DELETE FROM diary_entries WHERE id = ?', [id]);
```

Локальная БД может содержать данные нескольких аккаунтов. Числового id
недостаточно, чтобы подтвердить владение записью.

### Общий список включал данные всех локальных пользователей

```ts
export function listAllDiaryEntries(): DiaryEntry[] {
  return getDb().getAllSync('SELECT * FROM diary_entries ORDER BY id DESC', []);
}
```

Этот список используется reminder-сервисами. После смены локального аккаунта
напоминания могли учитывать чужие записи.

### Удаление на web не выполнялось

```ts
Alert.alert(title, message, [
  { text: cancel, style: 'cancel' },
  { text: remove, style: 'destructive', onPress: deleteEntry },
]);
```

В `react-native-web` `Alert.alert()` не создаёт рабочий callback destructive
кнопки. Пользователь нажимал «Удалить», но запись оставалась.

### Фото удалялись до подготовки замены

```ts
await deleteDiaryAttachmentsForEntry(entryId);
for (const sourceUri of sourceUris) {
  const localPath = await persistPhotoFile(sourceUri, entryId, index);
  // insert
}
```

При ошибке подготовки нового файла старые вложения уже были удалены.

### Diary service содержал отдельный HTML/PDF generator

`generateDoctorPdf()` смешивал CRUD дневника, HTML и platform-specific
print/share. Функция не использовалась; актуальная генерация отчётов находится
в `doctor-report-service.ts`.

## Рефакторинг и объяснение

### 1. Явный результат мутаций

```ts
export type DiaryMutationResult =
  | { ok: true; entryId: number }
  | {
      ok: false;
      code:
        | 'not_authenticated'
        | 'profile_not_found'
        | 'entry_not_found'
        | 'invalid_input';
    };
```

Create/update/delete больше не маскируют отказ. Экран закрывает editor только
при `ok: true`.

Это делает ошибочные состояния частью TypeScript-контракта вместо неявных
`null` и исключений.

### 2. Проверка владения

Сервис получает id профилей текущего пользователя:

```ts
SELECT id FROM profiles WHERE userId = ?
```

Read/create проверяют принадлежность `profileId`. Update/delete сначала
загружают запись, затем подтверждают, что её `profileId` принадлежит текущему
пользователю.

Финальный SQL использует defense in depth:

```ts
UPDATE diary_entries
SET type = ?, details = ?
WHERE id = ? AND profileId = ?
```

Та же семантика реализована в `WebDb`, поэтому web и native не расходятся.

### 3. Фильтрация глобального списка

`listAllDiaryEntries()` теперь фильтрует строки через `Set` принадлежащих
пользователю profile ids. Reminder reconciliation не видит записи другого
локального аккаунта.

Сложность фильтрации — `O(P + E)`, где `P` — число профилей, `E` — записей.
Использование `Set` исключает повторный линейный поиск для каждой записи.

### 4. Defensive input

Create проверяет:

- положительный safe integer `profileId`;
- непустой нормализованный `type`;
- строковый `details`;
- валидный `createdAt`.

Batch сначала проверяет все элементы и владение профилем, затем начинает
запись. Это предотвращает часть случаев частично сохранённой формы.

### 5. Rollback при ошибке вложений новой записи

Если сохранение фото после INSERT завершается исключением, сервис удаляет
созданные attachment rows и саму запись дневника. Пользователь не получает
«пустую» запись после неуспешного create.

Полноценная SQL/file transaction невозможна, потому что файловая система не
участвует в транзакции SQLite, но компенсирующая операция возвращает
согласованное состояние.

### 6. Безопасная замена фото

Новые URI подготавливаются параллельно через `Promise.all` **до** удаления
старых вложений:

```ts
const persistedPaths = await Promise.all(
  sourceUris.map((uri, index) => persistPhotoFile(uri, entryId, index)),
);
await deleteDiaryAttachmentsForEntry(entryId);
```

Плюсы:

- старые фото сохраняются, пока новые ещё копируются/конвертируются;
- максимум пять файлов обрабатываются параллельно;
- одинаковое поведение web/native.

При редактировании `photoUris: undefined` теперь означает «сохранить
существующие вложения». Пустой массив передаётся только при явной очистке фото.
Это устраняет неявное удаление вложений через `entry.photoUris ?? []`.

### 7. Cross-platform destructive confirmation

`confirmDestructiveAction()` использует:

- `globalThis.confirm()` на web;
- destructive `Alert.alert()` на iOS/Android;
- `onError` для rejected async action.

Utility не зависит от дневника и пригоден для других destructive flows.

### 8. Защита UI от stale load

Экран ведёт `loadRequestId`. Результат старого запроса не перезаписывает список
после переключения активного профиля. При отсутствии профиля список и карта
вложений очищаются.

Transient Zustand state может быть пуст после web reload/HMR, хотя профиль уже
есть в IndexedDB. `getOrLoadActiveProfileId()` восстанавливает persisted
профиль при focus и непосредственно перед Save. Дневник больше не показывает
рабочий wizard, который затем молча отбрасывает запись из-за `null` profile id.

### 9. Явная граница durable persistence

`WebDb` использует in-memory cache и отложенную IndexedDB запись. Раньше UI
сообщал об успехе до срабатывания debounce (~120 мс), поэтому немедленный
refresh мог потерять только что созданную/изменённую запись.

В platform DB adapters добавлен единый контракт:

```ts
await persistDbWrites();
```

- web вызывает `flushWebStore()` и ждёт завершения IndexedDB transaction;
- native возвращает resolved Promise, потому что `runSync` уже закоммитил
  SQLite операцию.

Create/update/delete ждут эту границу до возврата `ok: true`. Компенсирующее
удаление при ошибке вложений также flush-ится до проброса ошибки.

### 10. High Cohesion

Неиспользуемый `generateDoctorPdf()` удалён из `diary-service`. Генерация и
share отчётов остаются в специализированном `doctor-report-service.ts`.

Это уменьшает зависимости diary CRUD от `Platform`, Expo Print/Sharing,
цветов и HTML.

### 11. Тестируемость

Добавлены проверки:

- запрет create/read/update/delete для чужого профиля;
- исключение чужих записей из reminder-списка;
- WebDb update/delete по паре `entryId + profileId`;
- web cancel/confirm и native destructive alert;
- доставка rejected action в `onError`;
- немедленный flush diary write без ожидания debounce timer;
- восстановление persisted active profile при пустом Zustand state;
- существующие create/batch/update/delete сценарии.

### 12. Полная валидация wizard

`finishWizard()` проверяет каждую непустую секцию через
`validateDiarySection()` (для шкал — `validateClinicalScale()`). `skipSection`
также блокирует переход, если пользователь частично заполнил секцию, но
пропустил обязательное поле. Частично заполненная «Лекарство» или «Питание»
больше не сохраняется в обход пошаговой валидации.

## Возможные побочные эффекты и компромиссы

1. Мутации теперь возвращают `DiaryMutationResult`. Старые вызовы, которые
   игнорируют результат, продолжают работать, но новые должны проверять `ok`.
2. Ownership check добавляет несколько локальных SELECT. Для небольшого
   offline-дневника это дешевле, чем риск смешивания аккаунтов.
3. Batch не является одной транзакцией: ошибка файловой системы на поздней
   записи не откатывает уже завершённые предыдущие записи.
4. Browser confirm нельзя стилизовать как React Native modal. Выбрана
   надёжность; кастомный modal можно добавить отдельно.
5. Подготовка фото параллельна. Максимум ограничен пятью файлами, поэтому
   потребление памяти остаётся ограниченным.

## Альтернативные решения

### Альтернатива 1: `DiaryRepository`

Интерфейс:

```ts
interface DiaryRepository {
  listByProfile(profileId: number): DiaryEntry[];
  create(input: DiaryEntryInput): number;
  update(entry: DiaryEntry): boolean;
  delete(entryId: number, profileId: number): boolean;
}
```

Плюсы:

- SQL/IndexedDB полностью скрыты;
- простой fake repository для тестов;
- легче перейти на server sync.

Минусы:

- большой migration diff;
- необходимо переписать связанные reminder/report/sync сервисы;
- избыточно для текущего ограниченного исправления.

### Альтернатива 2: SQLite foreign keys + транзакции

Добавить связи `diary_entries → profiles`,
`diary_attachments → diary_entries` с `ON DELETE CASCADE` и выполнять CRUD в
`withTransactionSync`.

Плюсы:

- атомарные каскады на native;
- меньше ручного cleanup;
- целостность контролируется БД.

Минусы:

- миграция существующих таблиц SQLite;
- IndexedDB всё равно требует отдельной реализации;
- файловые URI нельзя откатить SQL-транзакцией.

## Заключение

Рефакторинг делает владение дневником явным, выравнивает WebDb и SQLite,
восстанавливает удаление на web и уменьшает риск потери фото. Следующий
отдельный шаг — repository/transaction слой для атомарного batch-save и
унификация ownership-проверок профиля, дневника, сканов и SOS.
