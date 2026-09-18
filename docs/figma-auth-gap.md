# Gap: Figma Make zip → Auth / onboarding / profile

Дата: 2026-09-18

Канон композиции — **Figma Make zip**, не live-фреймы `3328:12` / `3328:50` / `3328:79`.

| Zip | Route |
|-----|-------|
| `code-12.txt` Login | `/login` |
| `code-13.txt` Onboarding | `/onboarding-intro` |
| `code-14.txt` Profile chips | `/profile-setup` allergen step |

## Победители

UI/токены — zip. Auth submit, JWT, slides navigation, wizard save — текущий код.

## UI deltas

- Login: бренд-герой 80 круг + щит, «AllerGuide», tagline; Email + Пароль; CTA «Войти»; ссылка регистрация. **Нет phone/email tabs.** `applyLoginFieldInput` / JWT без изменений (`auth-login-input`, `auth-submit`).
- Onboarding: **3 слайда** zip (аллергены / сканер / карта), dots, Далее/Начать, Пропустить. Не 5 слайдов продукта.
- Profile allergen step: progress 4px, поиск, категории, chips `radius.full` + check. Остальные шаги wizard не из zip — save не ломаем.

## Не трогаем

Auth services, onboarding navigation, profile-setup validation/save.
