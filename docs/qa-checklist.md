# AllerGuide — регрессионный чеклист (internal alpha)

**Roadmap:** [P0.1](roadmap-to-prod.md#phase-0--stabilization-mvp--internal-alpha)  
**Архитектура:** [architecture.md](./architecture.md) · [development-rules.md](./development-rules.md)  
**Версия чеклиста:** 1.3  
**Целевые платформы:** iOS · Android · Web (Expo)

Чеклист для ручного прогона перед internal-сборкой (EAS preview) и перед включением backend / store submission.  
Все backend feature flags **выключены** (`EXPO_PUBLIC_BACKEND_AUTH=false`, `CLOUD_SYNC=false`, `AI_SCAN=false`).

---

## Метаданные прогона

| Поле | Значение |
|------|----------|
| Дата | |
| Тестировщик | |
| Сборка / коммит | |
| iOS build # | |
| Android build # | |
| Web URL / порт | |
| Локаль UI | ru / en / es / fr / de / it |
| Тема | light / dark / system |
| Устройства (≥3 для native) | |

**Итог прогона:** ☐ Pass · ☐ Pass с замечаниями · ☐ Fail

| Платформа | Статус | Блокеры (issue #) |
|-----------|--------|-------------------|
| iOS | ☐ | |
| Android | ☐ | |
| Web | ☐ | |

---

## Подготовка

- [ ] `pnpm install` из корня репозитория
- [ ] `pnpm typecheck` — без ошибок
- [ ] `pnpm test` — без падений
- [ ] Для native preview: установлена сборка из [EAS preview](eas-internal-preview.md)
- [ ] Для web: `cd apps/mobile && npx expo start --web --port 5000`
- [ ] Чистый аккаунт для smoke (новая регистрация) + отдельный аккаунт с данными (регрессия)
- [ ] Интернет доступен (wellness, Open Food Facts, карта)

**Легенда:** ✅ Pass · ⚠️ Minor · ❌ Fail · N/A — не применимо на платформе

---

## 1. Аутентификация

| # | Сценарий | iOS | Android | Web | Примечания |
|---|----------|-----|---------|-----|------------|
| 1.1 | Экран входа открывается для неавторизованного пользователя | ☐ | ☐ | ☐ | |
| 1.2 | Переключатель телефон / email работает | ☐ | ☐ | ☐ | |
| 1.3 | Валидация: пустые поля, короткий пароль (<6) | ☐ | ☐ | ☐ | |
| 1.4 | Успешный вход → bootstrap (intro / onboarding / home) | ☐ | ☐ | ☐ | |
| 1.5 | Регистрация нового пользователя | ☐ | ☐ | ☐ | |
| 1.6 | Неверный пароль — сообщение об ошибке | ☐ | ☐ | ☐ | |
| 1.7 | Language picker на login/register: 6 языков, UI обновляется | ☐ | ☐ | ☐ | |
| 1.8 | Выход из аккаунта → экран входа, данные недоступны без re-login | ☐ | ☐ | ☐ | `/profiles` → Logout |

---

## 2. Онбординг и первый запуск

| # | Сценарий | iOS | Android | Web | Примечания |
|---|----------|-----|---------|-----|------------|
| 2.1 | Intro: 5 слайдов (профиль, сканер, ежедневная защита, карта, SOS) | ☐ | ☐ | ☐ | `profile` / `scanner` / `care` / `map` / `sos` |
| 2.2 | Intro можно пропустить | ☐ | ☐ | ☐ | |
| 2.3 | Повторный вход не показывает intro | ☐ | ☐ | ☐ | |
| 2.4 | Выбор сценария: только я / только ребёнок / я + ребёнок | ☐ | ☐ | ☐ | |
| 2.5 | Wizard профиля: имя, год, **11 типов состояний**, аллергены | ☐ | ☐ | ☐ | |
| 2.5a | Шаг «Хронология»: дебют, статус, food timing, ocular (ринит) | ☐ | ☐ | ☐ | skip если нет типов |
| 2.5b | Шаг «Коморbidность» (≥2 типов): порядок появления | ☐ | ☐ | ☐ | skip если <2 типов |
| 2.5c | Шаг «Ваш фенотип»: карточка + disclaimer «не диагноз» | ☐ | ☐ | ☐ | skip если 0 фенотипов |
| 2.6 | Профиль ребёнка: требуется согласие родителя | ☐ | ☐ | ☐ | |
| 2.7 | После onboarding → главная с активным профилем | ☐ | ☐ | ☐ | |
| 2.8 | AppSplash / загрузка шрифтов без белого экрана >3 сек | ☐ | ☐ | ☐ | |

---

## 3. Профили

| # | Сценарий | iOS | Android | Web | Примечания |
|---|----------|-----|---------|-----|------------|
| 3.1 | Иконка профиля на главной открывает `/profile`; на других вкладках — быстрый switcher | ☐ | ☐ | ☐ | SOS без switcher |
| 3.2 | Переключение активного профиля меняет данные на экранах | ☐ | ☐ | ☐ | |
| 3.3 | Тап по активному профилю → редактирование | ☐ | ☐ | ☐ | |
| 3.4 | «+» в switcher → создание нового профиля | ☐ | ☐ | ☐ | |
| 3.5 | Редактирование: имя, год, аллергены, **история аллергии**, коморbidность | ☐ | ☐ | ☐ | `/profile-edit` |
| 3.5a | Тип `urticaria` в picker → UAS7 в рекомендуемых шкалах | ☐ | ☐ | ☐ | FR-PROF-12 |
| 3.6 | Удаление профиля с подтверждением | ☐ | ☐ | ☐ | `/profiles` |
| 3.7 | Экран «Мои профили»: язык, тема, logout | ☐ | ☐ | ☐ | deep link `/profiles` |
| 3.8 | Каталог аллергенов: группы, поиск, выбор | ☐ | ☐ | ☐ | |
| 3.9 | **S1** food-only + birch pollen без pollinosis: нет АСИТ/ПСВ в дневнике | ☐ | ☐ | ☐ | explicit-first |
| 3.10 | **S2** pollinosis: АСИТ виден, ПСВ скрыт | ☐ | ☐ | ☐ | |
| 3.11 | **S3** asthma: ПСВ виден, АСИТ скрыт | ☐ | ☐ | ☐ | |
| 3.12 | Смена типов в profile-edit сразу обновляет дневник/главную | ☐ | ☐ | ☐ | |
| 3.13 | Подсказка «Добавить тип» при аллергене без matching condition | ☐ | ☐ | ☐ | onboarding |
| 3.14 | Сканер / Маркет / Карта доступны при любом профиле | ☐ | ☐ | ☐ | инвариант |

---

## 4. Главная (Home)

| # | Сценарий | iOS | Android | Web | Примечания |
|---|----------|-----|---------|-----|------------|
| 4.1 | Бренд-header слева (знак + слоган); тап по логотипу после входа → главная; вход/регистрация без левого lockup | ☐ | ☐ | ☐ | `ScreenBrandHeader` |
| 4.2 | Кнопка SOS в шапке → экран SOS | ☐ | ☐ | ☐ | |
| 4.3 | Wellness «Состояние сегодня»: слой 1 без единиц, слой 2 (Подробнее / тап по строке) — название / категория / значение или «нет данных» | ☐ | ☐ | ☐ | нужен интернет |
| 4.4 | «Подробнее» → карта | ☐ | ☐ | ☐ | |
| 4.5 | Блок дневника: quick-add кнопки по профилю (S1: симптомы+питание) | ☐ | ☐ | ☐ | ProfileCapabilities |
| 4.6 | Quick actions: Сканер, Карта | ☐ | ☐ | ☐ | |
| 4.7 | Двухстрочный disclaimer из ТЗ (информационный характер, не заменяет врача) | ☐ | ☐ | ☐ | |
| 4.8 | Tab bar: 6 вкладок (Home, Diary, Scanner, Market, Map, SOS) | ☐ | ☐ | ☐ | FR-UX-04 |
| 4.9 | Блок подсказок фенотипа / reassessment hints (при ≥1 phenotype) | ☐ | ☐ | ☐ | FR-PROF-16 |

---

## 5. Дневник

| # | Сценарий | iOS | Android | Web | Примечания |
|---|----------|-----|---------|-----|------------|
| 5.1 | Секция «Записи в дневник» сверху; история только с выбранными значениями | ☐ | ☐ | ☐ | FR-DIARY-03/06 |
| 5.2 | Создание записи (wizard / section) | ☐ | ☐ | ☐ | |
| 5.3 | Редактирование существующей записи | ☐ | ☐ | ☐ | |
| 5.4 | Удаление записи | ☐ | ☐ | ☐ | |
| 5.5 | Записи изолированы между профилями | ☐ | ☐ | ☐ | |
| 5.6 | Отчёт врачу → PDF preview / share | ☐ | ☐ | ☐ | `expo-print` |
| 5.6a | PDF: блок «Хронология и фенотипы профиля» при заполненной истории | ☐ | ☐ | ☐ | FR-PROF-17 |
| 5.6b | PDF: SNOMED из reactionType (анафилаксия в «Питание») | ☐ | ☐ | ☐ | Phase 3 |
| 5.6c | Клинические оценки на `/clinical-scales`, не в ленте дневника | ☐ | ☐ | ☐ | FR-DIARY-14 |
| 5.7 | Экран `/clinical-scales`: рекомендуемые и прочие шкалы | ☐ | ☐ | ☐ | |
| 5.8 | Auto пыльца/скан/ЛС не показываются шагами, пишутся в metadata | ☐ | ☐ | ☐ | нужен интернет для пыльцы |
| 5.9 | Disclaimer: «Дневник помогает фиксировать наблюдения и не заменяет консультацию врача» | ☐ | ☐ | ☐ | |
| 5.10 | **§7.3 photo:** секция «Кожа» → шаг фото → камера/галерея, превью, удаление | ☐ | ☐ | ☐ | FR-DIARY-photo; web: gallery |
| 5.10b | **§7.3 medicine photo:** «Лекарство» → фото / голос / вручную → предзаполнение → сохранить | ☐ | ☐ | ☐ | FR-DIARY-medicine-photo |
| 5.11 | **§7.3 photo:** фото видно в ленте и в PDF отчёта | ☐ | ☐ | ☐ | лимит ≤5, JPEG |
| 5.12 | **§7.3 dish:** Питание → «Ввести вручную» → «борщ» → чеклист состава → уровень реакции | ☐ | ☐ | ☐ | FR-DIARY-dish-breakdown |
| 5.13 | **§7.3 dish:** конфликт с профилем подсвечен; OFF enrichment (если сеть) | ☐ | ☐ | ☐ | offline: локальный каталог |
| 5.14 | **§7.3 voice:** микрофон на text-шаге → текст в поле | ☐ | ☐ | ☐ | FR-DIARY-voice; Chromium web |
| 5.15 | **§7.3 voice:** отказ permission / unsupported → wizard остаётся usable | ☐ | ☐ | ☐ | text-fallback |

---

## 6. Сканер

| # | Сценарий | iOS | Android | Web | Примечания |
|---|----------|-----|---------|-----|------------|
| 6.1 | Камера запрашивает permission (native) | ☐ | ☐ | N/A | web без камеры |
| 6.2 | Скан штрихкода → результат (OFF / keyword) | ☐ | ☐ | N/A | тестовый штрихкод |
| 6.3 | Совпадение с аллергиями профиля подсвечено | ☐ | ☐ | N/A | |
| 6.4 | Три кнопки: Сканер / Штрих-код / Ввести вручную; чипов режимов нет | ☐ | ☐ | ☐ | FR-SCAN-01 |
| 6.4a | Ручной ввод состава → вердикт; цифры 8–14 → штрихкод | ☐ | ☐ | ☐ | web fallback |
| 6.5 | История сканов сохраняется | ☐ | ☐ | ☐ | |
| 6.6 | Повторный скан → локальный кэш (`barcode_cache`) | ☐ | ☐ | ☐ | |
| 6.7 | Disclaimer | ☐ | ☐ | ☐ | |

**Тестовые штрихкоды (Open Food Facts):** уточнить перед прогоном или использовать известный продукт из OFF.

---

## 7. SOS

| # | Сценарий | iOS | Android | Web | Примечания |
|---|----------|-----|---------|-----|------------|
| 7.1 | SOS-карта: аллергии, лекарства, контакты | ☐ | ☐ | ☐ | |
| 7.2 | Кнопка звонка (tel:) | ☐ | ☐ | N/A | |
| 7.3 | Редактирование SOS только из профиля → `/sos-edit` | ☐ | ☐ | ☐ | экран SOS read-only |
| 7.3a | Empty-state без профиля: текст про иконку на главной, без перехода в setup | ☐ | ☐ | ☐ | пункт 50 |
| 7.4 | Экстренные контакты: добавить / удалить | ☐ | ☐ | ☐ | |
| 7.5 | App lock: кнопка экстренной информации без unlock | ☐ | ☐ | N/A | |
| 7.6 | Красный акцент tab SOS | ☐ | ☐ | ☐ | |
| 7.7 | Паспорт аллергика (свёрнут / раскрыт) | ☐ | ☐ | ☐ | |
| 7.8 | Алгоритм анафилаксии + бифазная реакция | ☐ | ☐ | ☐ | |
| 7.9 | Share / PDF паспорта | ☐ | ☐ | ☐ | |

---

## 8. Карта и Маркет

| # | Сценарий | iOS | Android | Web | Примечания |
|---|----------|-----|---------|-----|------------|
| 8.1 | Карта открывается с главной / quick link | ☐ | ☐ | ☐ | `/map` |
| 8.2 | Слои: пыльца / места / оба; AQ overlay | ☐ | ☐ | ☐ | UAQI card + легенда |
| 8.2a | Picker: все 17 таксонов в TREE/GRASS/WEED | ☐ | ☐ | ☐ | вид без данных не сбрасывается |
| 8.2b | UPI 0–5 + групповой heatmap legend | ☐ | ☐ | ☐ | не обещать per-species heatmap |
| 8.2c | Поиск мест: autocomplete → details | ☐ | ☐ | ☐ | пустой live ≠ московский catalog |
| 8.3 | Яндекс.Карты WebView (Москва/МО) | ☐ | ☐ | ☐ | |
| 8.4 | Геолокация (permission + карта) | ☐ | ☐ | N/A | |
| 8.4 | Список клиник / врачей АДАИР | ☐ | ☐ | ☐ | |
| 8.5 | Маркет: каталог продуктов | ☐ | ☐ | ☐ | `/market` deep link |
| 8.6 | Disclaimer | ☐ | ☐ | ☐ | |

---

## 9. Эксперт (АДАИР)

| # | Сценарий | iOS | Android | Web | Примечания |
|---|----------|-----|---------|-----|------------|
| 9.1 | Список статей открывается | ☐ | ☐ | ☐ | deep link `/expert` |
| 9.2 | Фильтр по категориям | ☐ | ☐ | ☐ | |
| 9.3 | Открытие статьи, контент на выбранном языке | ☐ | ☐ | ☐ | |
| 9.4 | Medical disclaimer | ☐ | ☐ | ☐ | |

---

## 10. Настройки

| # | Сценарий | iOS | Android | Web | Примечания |
|---|----------|-----|---------|-----|------------|
| 10.1 | Экстренный номер: сохранение | ☐ | ☐ | ☐ | `/profile` / settings, не с SOS |
| 10.2 | Напоминание дневника: toggle | ☐ | ☐ | N/A | push только native |
| 10.3 | Cloud backup UI (должен сообщить об ошибке / OFF без backend) | ☐ | ☐ | ☐ | flags OFF |
| 10.4 | Legal: Privacy + Terms, бренд-header с «назад» | ☐ | ☐ | ☐ | |
| 10.4a | Клавиатура в web-модалке (дневник / OCR) не перекрывает поле ввода | ☐ | N/A | ☐ | visualViewport inset |
| 10.5 | Theme toggle | ☐ | ☐ | ☐ | |

---

## 11. Локализация и тема

| # | Сценарий | iOS | Android | Web | Примечания |
|---|----------|-----|---------|-----|------------|
| 11.1 | Переключение ru → en: все основные экраны | ☐ | ☐ | ☐ | smoke 2 языка минимум |
| 11.2 | Флаги в language picker | ☐ | ☐ | ☐ | |
| 11.3 | Светлая тема: Claro Green tokens | ☐ | ☐ | ☐ | bg #F4F6F9, accent/info #2A9D8F, accentLight #E6F6F4; нет medical blue ([brand-claro-green.md](./brand-claro-green.md)) |
| 11.4 | Тёмная тема: читаемость, контраст | ☐ | ☐ | ☐ | |
| 11.5 | System theme следует OS | ☐ | ☐ | N/A | |

---

## 12. Персистентность и offline

| # | Сценарий | iOS | Android | Web | Примечания |
|---|----------|-----|---------|-----|------------|
| 12.1 | Kill app → reopen: сессия и данные на месте | ☐ | ☐ | ☐ | SQLite / IndexedDB |
| 12.2 | Offline: дневник читается без сети | ☐ | ☐ | ☐ | |
| 12.3 | Offline: SOS доступен | ☐ | ☐ | ☐ | |
| 12.4 | Offline: wellness показывает graceful state | ☐ | ☐ | ☐ | |
| 12.5 | Web: refresh страницы сохраняет данные | N/A | N/A | ☐ | IndexedDB |

---

## 13. Бренд и UI

| # | Сценарий | iOS | Android | Web | Примечания |
|---|----------|-----|---------|-----|------------|
| 13.1 | App icon / splash (native) | ☐ | ☐ | N/A | Shield Chart |
| 13.2 | Tab icons (custom BrandTabIcon) | ☐ | ☐ | ☐ | |
| 13.3 | Кнопки `Button` component, flat cards | ☐ | ☐ | ☐ | |
| 13.4 | Нет crash на повороте экрана (tablet) | ☐ | ☐ | N/A | iOS supportsTablet |
| 13.5 | ErrorBoundary: нет белого экрана смерти | ☐ | ☐ | ☐ | |

---

## 14. Web-специфика

| # | Сценарий | Web | Примечания |
|---|----------|-----|------------|
| 14.1 | Shell max-width, центрирование | ☐ | |
| 14.2 | Tab bar не перекрывает контент | ☐ | |
| 14.3 | Keyboard: формы login/diary не ломают layout | ☐ | |
| 14.4 | Deep routes работают: `/profiles`, `/expert`, `/settings` | ☐ | |
| 14.5 | IndexedDB: данные профиля/дневника сохраняются после reload | ☐ | P2.7c |
| 14.6 | Быстрый ввод 5 записей дневника — UI без заметных фризов | ☐ | idle flush |

---

## 15. Регрессия после сборки (native only)

| # | Сценарий | iOS | Android | Примечания |
|---|----------|-----|---------|------------|
| 15.1 | Cold start <3 сек до интерактивного UI (p95) | ☐ | ☐ | см. `performance-cold-start.md` |
| 15.2 | Camera permission dialog на русском / выбранном языке | ☐ | ☐ | |
| 15.3 | Location permission на карте | ☐ | ☐ | |
| 15.4 | Notifications permission (reminder toggle) | ☐ | ☐ | |
| 15.5 | Нет crash при background → foreground | ☐ | ☐ | |

---

## 16. Клинический профиль (taxonomy Phases 1–4)

Ручной прогон матрицы **S1–S10** — [`clinical-features-raaci.md` §11](./clinical-features-raaci.md#11-матрица-клинических-фenotипов-s1s10). Backend flags **OFF** (offline-first).

| # | Сценарий | iOS | Android | Web | Phenotype / FR |
|---|----------|-----|---------|-----|----------------|
| 16.1 | Онбординг: wizard (conditions+options → allergens → crossReactions → symptomBaseline → history → comorbidity → phenotype) | ☐ | ☐ | ☐ | FR-PROF-14..20, UX P1–P3 |
| 16.2 | **S1** atopic-march-child: АтД + поллиноз + астма + порядок в comorbidity | ☐ | ☐ | ☐ | S1 |
| 16.3 | **S2** aria-asthma: ринит + астма → hints на главной | ☐ | ☐ | ☐ | S2, wellness |
| 16.4 | **S3** aria-conjunctivitis: ринит + ocularSymptoms | ☐ | ☐ | ☐ | S3 |
| 16.5 | **S4** food-anaphylaxis-risk: food + SOS anaphylaxisHistory | ☐ | ☐ | ☐ | S4, SOS banner |
| 16.6 | **S9** adult-onset-food: food + дебют adulthood → reassessment hint | ☐ | ☐ | ☐ | S9 |
| 16.7 | Карточка «Ваш фенотип» в wizard: disclaimer, без gating сканера | ☐ | ☐ | ☐ | FR-PROF-16 |
| 16.8 | Profile-edit: секция «История аллергии» + comorbidity сохраняются offline | ☐ | ☐ | ☐ | FR-PROF-14/15 |
| 16.9 | PDF: блок conditionPhenotypes с хронологией и фенотипами | ☐ | ☐ | ☐ | FR-PROF-17 |
| 16.10 | Сканер / карта / маркет доступны при любом фенотипе | ☐ | ☐ | ☐ | invariant |

**Итог §16:** ☐ Pass · ☐ Fail

---

## Staging — backend auth E2E (P1.2c)

**Профиль сборки:** EAS `staging` ([`eas-staging-build.md`](eas-staging-build.md))  
**API:** `https://api.staging.allerguide.app` (или ваш `STAGING_API_URL`)  
**Флаги:** `BACKEND_AUTH=true`, `CLOUD_SYNC=true`, `AI_SCAN=true`

Перед mobile smoke (опционально, с машины с доступом к API):

```bash
./scripts/staging-auth-smoke.sh
```

### Метаданные staging-прогона

| Поле | Значение |
|------|----------|
| Staging API health | ☐ 200 `GET /api/health` |
| EAS profile | `staging` |
| Тестовый email | `staging-qa+…@example.com` (уникальный) |

### Сценарии auth (обязательно на ≥1 native + web)

| ID | Сценарий | iOS | Android | Web | Критерий Pass |
|----|----------|-----|---------|-----|---------------|
| **S.1** | Register нового email → onboarding/home | ☐ | ☐ | ☐ | Нет «Сервер недоступен»; пользователь в `profile.app_users` на API |
| **S.2** | Login тем же email/паролем после logout | ☐ | ☐ | ☐ | Успешный вход, JWT выдан |
| **S.3** | Cold start: kill app → reopen | ☐ | ☐ | ☐ | **Не** экран login; сессия жива (native: SecureStore + SQLite; web: IndexedDB settings) |
| **S.4** | Create profile после login | ☐ | ☐ | ☐ | Профиль в UI + `POST /api/profiles` на сервере (dual-write) |
| **S.5** | Неверный пароль | ☐ | ☐ | ☐ | Сообщение об ошибке, без crash |
| **S.6** | Logout → login screen | ☐ | ☐ | ☐ | JWT очищен; повторный login работает |
| **S.7** | Airplane mode после login: дневник | ☐ | ☐ | N/A | Offline-first: запись дневника без сети |

### Проверка JWT на native (опционально)

После S.1/S.2 на Android/iOS: в dev можно убедиться, что `authToken` / `authUserId` есть в SecureStore (не логировать JWT в issues).

### Итог P1.2c

☐ S.1–S.3 Pass на **Android или iOS** + **web**  
☐ `staging-auth-smoke.sh` Pass (API)  
☐ Нет P0/P1 блокеров auth

### P1.2e — Offline regression (backend auth ON)

| ID | Сценарий | iOS | Android | Web | Критерий Pass |
|----|----------|-----|---------|-----|---------------|
| **O.1** | После login: airplane mode → запись в дневник | ☐ | ☐ | N/A | Запись сохраняется локально |
| **O.2** | После login: airplane mode → сканер (ручной ввод) | ☐ | ☐ | ☐ | Результат без API |
| **O.3** | Logout → login снова (online) | ☐ | ☐ | ☐ | Локальные данные на месте; профили с сервера при login |
| **O.4** | Create profile **offline** (backend auth) | ☐ | ☐ | ☐ | Понятная ошибка «нет сети», без crash |
| **O.5** | Kill app offline после login → reopen | ☐ | ☐ | ☐ | Сессия жива, дневник доступен |

---

## P1.4c — Cloud sync cross-device E2E

**Профиль:** EAS `staging` · `CLOUD_SYNC=true`  
**API:** `SYNC_ENABLED=true` на staging  
**Политика конфликтов:** [ADR 002](adr/002-sync-conflict-policy.md) (last-write-wins)

Перед mobile smoke (опционально):

```bash
./scripts/staging-smoke.sh          # health + features.sync
./scripts/staging-sync-smoke.sh     # encrypted v2 round-trip
```

### Метаданные sync-прогона

| Поле | Значение |
|------|----------|
| Устройство A | (модель / OS) |
| Устройство B | (модель / OS) |
| Recovery key сохранён | ☐ вне приложения |

### Сценарии backup (обязательно на 2 native-устройствах)

| ID | Сценарий | Dev A | Dev B | Критерий Pass |
|----|----------|-------|-------|---------------|
| **B.1** | Первый upload: setup recovery key → подтверждение → upload | ☐ | N/A | Успех; ключ показан и подтверждён |
| **B.2** | Данные на A: профиль + запись дневника + SOS note | ☐ | N/A | Локально видны |
| **B.3** | Upload backup на A | ☐ | N/A | «Резервная копия загружена» |
| **B.4** | Login тем же аккаунтом на B | N/A | ☐ | Успешный вход |
| **B.5** | Download на B без локального ключа → ввод recovery key | N/A | ☐ | Модалка ключа; после ввода — успех |
| **B.6** | Данные после restore на B | N/A | ☐ | Профиль, дневник, SOS совпадают с A |
| **B.7** | Неверный recovery key на B | N/A | ☐ | Ошибка «Неверный ключ», данные не меняются |
| **B.8** | Повторный upload с B → download на A | ☐ | ☐ | LWW: данные B видны на A после download |

### Web (опционально)

| ID | Сценарий | Web | Примечание |
|----|----------|-----|------------|
| **B.W1** | Upload/download с recovery key | ☐ | Требует `crypto.subtle` (обычно OK в браузере) |

### Итог P1.4c

☐ B.1–B.6 Pass на **двух** native-устройствах  
☐ `staging-sync-smoke.sh` Pass (API)  
☐ Recovery key сохранён тестером вне приложения

---

## P1.5b — AI scan staging E2E

**Профиль:** EAS `staging` · `AI_SCAN_ENABLED=true` · `BACKEND_AUTH=true`  
**API:** `AI_SCAN_ENABLED=true`, `OPENAI_API_KEY`, `SCAN_REQUIRE_AUTH=true`

Перед mobile smoke:

```bash
./scripts/staging-scan-smoke.sh
```

### Сценарии scan (обязательно на ≥1 native)

| ID | Сценарий | iOS | Android | Web | Критерий Pass |
|----|----------|-----|---------|-----|---------------|
| **C.1** | Login → сканер → ручной ввод состава | ☐ | ☐ | ☐ | Результат без «Сервер недоступен»; источник **ИИ-анализ** |
| **C.2** | Повтор того же текста | ☐ | ☐ | ☐ | Быстрее / из кэша (API `cached: true` в логах) |
| **C.3** | Airplane mode → ручной scan | ☐ | ☐ | N/A | Mock fallback, без crash (offline-first) |
| **C.4** | Logout → scan без login | ☐ | ☐ | ☐ | Mock или ошибка auth, без crash |

### Итог P1.5b

☐ C.1 Pass на **Android или iOS**  
☐ `staging-scan-smoke.sh` Pass (API)  
☐ Health `/api/health` → `features.aiScan: true`, `scan.dailyBudget: 50`

---

## Yandex AI scanner staging (Phases 1–2 + B/C)

**Doc:** [staging-yandex-ai.md](staging-yandex-ai.md) · **Профиль:** EAS `staging`  
**API health:** `aiScanProvider=yandex`, `ycOcr`, `ycScanIntentLlm`, `ycSearch`

Перед mobile smoke:

```bash
./scripts/staging-yandex-ai-smoke.sh
```

| ID | Сценарий | iOS | Android | Web | Критерий Pass |
|----|----------|-----|---------|-----|---------------|
| **Y.1** | Фото этикетки с «Состав: …» | ☐ | ☐ | ☐ | OCR → intent label/menu → LLM verdict (не только mock) |
| **Y.2** | Фото / имя блюда без OFF hit | ☐ | ☐ | ☐ | Search ingredients и/или LLM; без crash при 404 |
| **Y.3** | Airplane mode → фото / ручной текст | ☐ | ☐ | N/A | Demo OCR + mock scan |
| **Y.4** | API 5xx (airplane mid-scan) | ☐ | ☐ | ☐ | Graceful mock / error, app usable |
| **Y.5** | Повтор того же состава | ☐ | ☐ | ☐ | Быстрее (scan cache) |

### Итог Yandex AI

☐ `staging-yandex-ai-smoke.sh` Pass  
☐ Y.1 + Y.3 Pass на **Android или iOS**  
☐ Production EAS: OCR/intent/search всё ещё **off**

---

## P1.7 — Closed beta gate (координатор)

**Runbook:** [closed-beta-p17.md](closed-beta-p17.md) · **Бриф тестерам:** [beta-tester-brief-ru.md](beta-tester-brief-ru.md)

### Preflight (до рассылки сборки)

```bash
./scripts/staging-preflight.sh
```

| # | Проверка | Pass |
|---|----------|------|
| **G.1** | `staging-preflight.sh` (health + auth + sync + scan) | ☐ |
| **G.2** | CI `main`: quality + api-integration | ☐ |
| **G.3** | Internal QA: S.1–S.4, O.1–O.3, B.1–B.6, C.1 | ☐ |
| **G.4** | EAS staging build ≤ 7 дней | ☐ |

### Минимум от 10–20 тестеров

| Метрика | Порог | Факт |
|---------|-------|------|
| Завершили onboarding | ≥ 80% | |
| Auth S.1–S.3 без P0 | 0 блокеров | |
| Cross-device B.1–B.6 | ≥ 1 пара устройств | |
| Scan C.1 «ИИ-анализ» | ≥ 70% | |
| Открытые P0 | 0 | |

### Итог P1.7

☐ Gate out выполнен → milestone Phase 1 закрыт → старт Phase 2  
☐ Feedback issues с меткой `beta` разобраны

---

## P2.1a — Maestro offline smoke (автоматизация)

**Документация:** [`maestro.md`](maestro.md)  
**Сборка:** EAS `preview` (`EXPO_PUBLIC_BACKEND_AUTH=false`)  
**Запуск:** `pnpm --filter mobile maestro:test` (нужен Maestro CLI + emulator + установленный APK)

| Flow | Файл | Проверка |
|------|------|----------|
| Onboarding | `onboarding-smoke.yaml` | register → profile → `tab-home` |
| Diary | `diary-smoke.yaml` | новая запись → симптомы |
| Diary dish | `diary-dish-smoke.yaml` | «борщ» → `diary-dish-checklist` → save |
| Diary photo | `diary-photo-smoke.yaml` | «Кожа» → шаг `diary-photo-step` |
| Scanner | `scanner-smoke.yaml` | ручной ввод «молоко» → `scanner-result` |
| SOS | `sos-smoke.yaml` | `sos-profile-card`, паспорт |
| Settings | `settings-smoke.yaml` | `/profile`, номер 112 |

### Итог P2.1a

☐ Offline smoke green на Android emulator (включая diary dish/photo)  
☐ `testID` стабильны (не зависят от локали)  
☐ Документация локального запуска актуальна

---

## P2.1b — Maestro staging (auth + backup)

**Документация:** [`maestro.md`](maestro.md) § P2.1b  
**Сборка:** EAS `staging` или `./scripts/maestro-build-apk.sh staging`  
**API:** `https://api.staging.allerguide.app` или локально `maestro-start-api.sh` + `10.0.2.2:3001`

| Flow | Файл | Проверка |
|------|------|----------|
| Auth | `staging-auth-smoke.yaml` | register (API) → logout → login |
| Backup | `staging-backup-smoke.yaml` | fixture recovery key → upload → «Готово» |

**Запуск:** `pnpm --filter mobile maestro:staging`

### Итог P2.1b

☐ `staging-smoke-all.yaml` green против staging или local API  
☐ Fixture recovery key только в staging/internal builds

---

## P2.1c — Nightly CI Maestro

**Workflow:** [`.github/workflows/maestro-nightly.yml`](../.github/workflows/maestro-nightly.yml)  
**Cron:** 03:00 UTC ежедневно + `workflow_dispatch`

| Job | Suite |
|-----|-------|
| `maestro-offline` | `smoke-all.yaml` (preview) |
| `maestro-staging` | `staging-smoke-all.yaml` (Postgres + API in CI) |

### Итог P2.1c

☐ Nightly green 3+ ночи подряд  
☐ JUnit-артефакты при падении

---

## Шаблон баг-репорта

```markdown
**Платформа:** iOS 18 / Android 14 / Chrome
**Сборка:** EAS preview #123 / commit abc1234
**Локаль:** ru
**Шаги:**
1. ...
2. ...
**Ожидание:** ...
**Факт:** ...
**Скриншот / видео:** ...
**Приоритет:** P0 / P1 / P2
```

Создавайте issues в GitHub с метками `phase-0`, `bug` и ссылкой на пункт чеклиста (например `QA-6.2`).

---

## Связанные документы

- [Roadmap to Production](roadmap-to-prod.md)
- [EAS Internal Preview](eas-internal-preview.md)
- [EAS Staging Build](eas-staging-build.md)
- [Closed beta P1.7](closed-beta-p17.md)
- [Maestro E2E (P2.1)](maestro.md)
- [Functional Requirements](functional-requirements.md)
- [Clinical Features (RAAKI)](clinical-features-raaci.md)
- [QA Test Cases](qa-test-cases.md)
