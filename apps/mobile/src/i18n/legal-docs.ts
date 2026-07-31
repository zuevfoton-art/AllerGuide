import type { AppLocale } from '@/src/i18n/types';

export type LegalDocs = {
  privacyTitle: string;
  termsTitle: string;
  privacyBody: string;
  termsBody: string;
};

const RU: LegalDocs = {
  privacyTitle: 'Политика конфиденциальности',
  termsTitle: 'Условия использования',
  privacyBody: `# Политика конфиденциальности Aclearo

**Дата вступления в силу:** 4 июля 2026 г.

## 1. Общие положения

Приложение компании **Aclearo**. Оно помогает вести дневник аллергии, проверять продукты и хранить экстренную информацию. Данные о здоровье обрабатываются конфиденциально.

## 2. Какие данные мы обрабатываем

- Учётная запись (email или телефон)
- Профили аллергии, дневник, SOS, история сканов
- Опционально: зашифрованная облачная резервная копия (AES-GCM, zero-knowledge)

## 3. Где хранятся данные

По умолчанию данные хранятся **локально** (SQLite на iOS/Android, IndexedDB на web). При включении облачной синхронизации сервер хранит только зашифрованный blob — мы не можем прочитать содержимое.

## 4. Удаление данных

Вы можете удалить профили или весь аккаунт в «Мои профили». При удалении аккаунта с backend-auth удаляются профили на сервере и резервные копии (GDPR / 152-ФЗ).

## 5. Медицинский disclaimer

Приложение не является медицинским изделием и не заменяет консультацию врача.

## 6. Контакты

support@aclearo.com`,
  termsBody: `# Условия использования Aclearo

**Дата вступления в силу:** 4 июля 2026 г.

## 1. Принятие условий

Используя приложение, вы соглашаетесь с настоящими Условиями и Политикой конфиденциальности Aclearo.

## 2. Назначение

Приложение предназначено для личного учёта аллергии и предварительной проверки состава. Информация носит справочный характер.

## 3. Ограничение ответственности

Результаты сканера могут содержать ошибки. В экстренной ситуации звоните **103**.

## 4. Аккаунт

Вы можете удалить аккаунт и все данные в любой момент.

## 5. Контакты

support@aclearo.com`,
};

const EN: LegalDocs = {
  privacyTitle: 'Privacy Policy',
  termsTitle: 'Terms of Service',
  privacyBody: `# Aclearo Privacy Policy

**Effective date:** July 4, 2026

## 1. Overview

This Aclearo allergy companion helps you manage allergies offline-first. Health data is treated as sensitive.

## 2. Data we process

- Account (email or phone)
- Allergy profiles, diary, SOS, scan history
- Optional encrypted cloud backup (AES-GCM, zero-knowledge)

## 3. Storage

Data is stored **locally** by default (SQLite / IndexedDB). Cloud sync stores encrypted blobs only — we cannot read your health data.

## 4. Deletion

Delete profiles or your full account in Settings. Server-side profiles and backups are removed on account deletion when backend auth is enabled.

## 5. Medical disclaimer

The app is not a medical device and does not replace professional care.

## 6. Contact

support@aclearo.com`,
  termsBody: `# Aclearo Terms of Service

**Effective date:** July 4, 2026

## 1. Acceptance

By using the app you agree to these Terms and the Aclearo Privacy Policy.

## 2. Purpose

Informational allergy tracking and product scanning — not medical advice.

## 3. Liability

Scanner results may be incomplete. In emergencies call your local emergency number.

## 4. Account

You may delete your account and all data at any time.

## 5. Contact

support@aclearo.com`,
};

const DOCS: Record<AppLocale, LegalDocs> = {
  ru: RU,
  en: EN,
  es: EN,
  fr: EN,
  de: EN,
  it: EN,
};

export function getLegalDocs(locale: AppLocale): LegalDocs {
  return DOCS[locale] ?? EN;
}
