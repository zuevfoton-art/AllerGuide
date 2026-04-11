# AllerGuide Repository

Полная файловая сборка репозитория AllerGuide: Expo Router tabs, локальная SQLite-база, рабочие формы профилей и дневника, PDF-отчёт и mock AI-логика в сканере.[file:36][web:52][web:38][web:43]

## Стек

- Expo + React Native + TypeScript.[web:38]
- Expo Router tabs через каталог `(tabs)`, который Expo Router использует как специальную директорию для tab layout.[web:52][web:55]
- expo-sqlite с `openDatabaseSync`, что соответствует современному API Expo SQLite.[web:38][web:57][web:59]
- expo-print для `printToFileAsync`, которое сохраняет PDF в cache directory приложения.[web:43]

## Запуск

```bash
pnpm install
pnpm --filter mobile start
```

## GitHub publish

```bash
git init
git branch -M main
git remote add origin https://github.com/<account>/AllerGuide.git
git add .
git commit -m "feat: AllerGuide initial prototype"
git push -u origin main
```
