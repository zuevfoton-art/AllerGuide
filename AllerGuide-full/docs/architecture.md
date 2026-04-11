# AllerGuide Architecture

Репозиторий организован как monorepo с `apps/mobile`, `apps/api` и shared packages, что хорошо сочетается с Expo workspaces и позволяет держать mobile, backend и общие модули в одном исходном коде.[web:38][web:52]

## Mobile

Mobile-приложение использует Expo Router tabs, а директория `(tabs)` в структуре `app/` интерпретируется Expo Router как layout для вкладок.[web:52][web:55]

## Data

SQLite используется как локальное хранилище профилей и записей, а актуальный API Expo SQLite ориентирован на `openDatabaseSync` и современные методы работы с БД.[web:38][web:57][web:59]

## PDF

PDF-отчёт создаётся через `Print.printToFileAsync`, который сохраняет файл в cache directory приложения, после чего файл можно расшарить пользователю.[web:43]
