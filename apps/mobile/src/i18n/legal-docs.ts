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

## 5. Медицинский disclaimer (mdr-v2)

Приложение **не является медицинским изделием** по EU MDR 2017/745 и не предназначено для диагностики, лечения или предотвращения заболеваний. Дневник, сканер состава и индекс самочувствия носят информационный / decision-support характер и не заменяют консультацию врача.

Индекс самочувствия использует бета-калиброванные веса; пороги пыльцы и качества воздуха основаны на открытых источниках и могут не отражать индивидуальную чувствительность. Решения о лечении принимайте только с квалифицированным аллергологом.

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

/**
 * Draft translations of the RU/EN legal texts. They are not store-ready until
 * a lawyer reviews them under P3.3 — do not treat these strings as final.
 */
const LEGAL_REVIEW_DE =
  '> **Hinweis:** Diese Übersetzung wartet auf juristische Prüfung (P3.3) und ist kein endgültiger Rechtstext.';
const LEGAL_REVIEW_ES =
  '> **Aviso:** Esta traducción espera revisión jurídica (P3.3) y no es un texto legal definitivo.';
const LEGAL_REVIEW_FR =
  '> **Avis :** Cette traduction attend une relecture juridique (P3.3) et n’est pas un texte légal définitif.';
const LEGAL_REVIEW_IT =
  '> **Avviso:** Questa traduzione è in attesa di revisione legale (P3.3) e non è un testo giuridico definitivo.';

const DE: LegalDocs = {
  privacyTitle: 'Datenschutzerklärung',
  termsTitle: 'Nutzungsbedingungen',
  privacyBody: `# Datenschutzerklärung von Aclearo

${LEGAL_REVIEW_DE}

**Gültig ab:** 4. Juli 2026

## 1. Überblick

Die Aclearo-App hilft beim Führen eines Allergietagebuchs, bei der Produktprüfung und beim Speichern von Notfalldaten. Gesundheitsdaten werden vertraulich behandelt.

## 2. Welche Daten wir verarbeiten

- Konto (E-Mail oder Telefon)
- Allergieprofile, Tagebuch, SOS, Scan-Verlauf
- Optional: verschlüsseltes Cloud-Backup (AES-GCM, Zero-Knowledge)

## 3. Speicherung

Daten liegen standardmäßig **lokal** (SQLite unter iOS/Android, IndexedDB im Web). Bei aktivierter Cloud-Synchronisierung speichert der Server nur einen verschlüsselten Blob — wir können den Inhalt nicht lesen.

## 4. Löschung

Profile oder das gesamte Konto können Sie unter „Meine Profile“ löschen. Bei Kontolöschung mit Backend-Auth werden Serverprofile und Backups entfernt (DSGVO / 152-FZ).

## 5. Medizinischer Hinweis

Die App ist kein Medizinprodukt und ersetzt keine ärztliche Beratung.

## 6. Kontakt

support@aclearo.com`,
  termsBody: `# Nutzungsbedingungen von Aclearo

${LEGAL_REVIEW_DE}

**Gültig ab:** 4. Juli 2026

## 1. Annahme

Mit der Nutzung der App akzeptieren Sie diese Bedingungen und die Datenschutzerklärung von Aclearo.

## 2. Zweck

Die App dient der persönlichen Allergieerfassung und einer vorläufigen Zutatenprüfung. Die Informationen sind orientierend.

## 3. Haftung

Scannerergebnisse können Fehler enthalten. Im Notfall wählen Sie die örtliche Notrufnummer.

## 4. Konto

Sie können Konto und alle Daten jederzeit löschen.

## 5. Kontakt

support@aclearo.com`,
};

const ES: LegalDocs = {
  privacyTitle: 'Política de privacidad',
  termsTitle: 'Términos de uso',
  privacyBody: `# Política de privacidad de Aclearo

${LEGAL_REVIEW_ES}

**Fecha de entrada en vigor:** 4 de julio de 2026

## 1. Descripción general

La aplicación Aclearo ayuda a llevar un diario de alergias, comprobar productos y guardar información de emergencia. Los datos de salud se tratan de forma confidencial.

## 2. Qué datos tratamos

- Cuenta (correo o teléfono)
- Perfiles de alergia, diario, SOS, historial de escaneos
- Opcional: copia de seguridad cifrada en la nube (AES-GCM, zero-knowledge)

## 3. Almacenamiento

Por defecto los datos se guardan **en el dispositivo** (SQLite en iOS/Android, IndexedDB en web). Si activa la sincronización en la nube, el servidor solo guarda un blob cifrado: no podemos leer el contenido.

## 4. Eliminación

Puede eliminar perfiles o toda la cuenta en «Mis perfiles». Al eliminar la cuenta con autenticación de backend se borran los perfiles del servidor y las copias de seguridad (RGPD / 152-FZ).

## 5. Aviso médico

La aplicación no es un producto sanitario y no sustituye la consulta médica.

## 6. Contacto

support@aclearo.com`,
  termsBody: `# Términos de uso de Aclearo

${LEGAL_REVIEW_ES}

**Fecha de entrada en vigor:** 4 de julio de 2026

## 1. Aceptación

Al usar la aplicación acepta estos Términos y la Política de privacidad de Aclearo.

## 2. Finalidad

La aplicación sirve para el seguimiento personal de alergias y una comprobación preliminar de ingredientes. La información es orientativa.

## 3. Responsabilidad

Los resultados del escáner pueden contener errores. En una emergencia llame al número local de emergencias.

## 4. Cuenta

Puede eliminar la cuenta y todos los datos en cualquier momento.

## 5. Contacto

support@aclearo.com`,
};

const FR: LegalDocs = {
  privacyTitle: 'Politique de confidentialité',
  termsTitle: 'Conditions d’utilisation',
  privacyBody: `# Politique de confidentialité Aclearo

${LEGAL_REVIEW_FR}

**Date d’entrée en vigueur :** 4 juillet 2026

## 1. Présentation

L’application Aclearo aide à tenir un journal d’allergies, à vérifier des produits et à conserver des informations d’urgence. Les données de santé sont traitées de manière confidentielle.

## 2. Données traitées

- Compte (e-mail ou téléphone)
- Profils d’allergie, journal, SOS, historique des scans
- En option : sauvegarde cloud chiffrée (AES-GCM, zero-knowledge)

## 3. Stockage

Par défaut, les données restent **locales** (SQLite sur iOS/Android, IndexedDB sur le web). Si la synchronisation cloud est activée, le serveur ne conserve qu’un blob chiffré — nous ne pouvons pas en lire le contenu.

## 4. Suppression

Vous pouvez supprimer des profils ou l’ensemble du compte dans « Mes profils ». La suppression du compte avec authentification backend efface les profils serveur et les sauvegardes (RGPD / 152-FZ).

## 5. Avertissement médical

L’application n’est pas un dispositif médical et ne remplace pas un avis médical.

## 6. Contact

support@aclearo.com`,
  termsBody: `# Conditions d’utilisation Aclearo

${LEGAL_REVIEW_FR}

**Date d’entrée en vigueur :** 4 juillet 2026

## 1. Acceptation

En utilisant l’application, vous acceptez les présentes Conditions et la Politique de confidentialité Aclearo.

## 2. Objet

L’application sert au suivi personnel des allergies et à une vérification préliminaire des ingrédients. Les informations sont indicatives.

## 3. Responsabilité

Les résultats du scanner peuvent contenir des erreurs. En urgence, appelez le numéro d’urgence local.

## 4. Compte

Vous pouvez supprimer le compte et toutes les données à tout moment.

## 5. Contact

support@aclearo.com`,
};

const IT: LegalDocs = {
  privacyTitle: 'Informativa sulla privacy',
  termsTitle: 'Termini di utilizzo',
  privacyBody: `# Informativa sulla privacy di Aclearo

${LEGAL_REVIEW_IT}

**Data di entrata in vigore:** 4 luglio 2026

## 1. Panoramica

L’app Aclearo aiuta a tenere un diario delle allergie, a controllare i prodotti e a salvare informazioni di emergenza. I dati sanitari sono trattati in modo riservato.

## 2. Quali dati trattiamo

- Account (e-mail o telefono)
- Profili allergie, diario, SOS, cronologia scansioni
- Facoltativo: backup cloud crittografato (AES-GCM, zero-knowledge)

## 3. Conservazione

Di default i dati restano **in locale** (SQLite su iOS/Android, IndexedDB sul web). Con la sincronizzazione cloud il server conserva solo un blob cifrato: non possiamo leggerne il contenuto.

## 4. Cancellazione

È possibile eliminare i profili o l’intero account in «I miei profili». Con l’autenticazione backend, la cancellazione dell’account rimuove profili e backup sul server (GDPR / 152-FZ).

## 5. Avvertenza medica

L’app non è un dispositivo medico e non sostituisce il parere del medico.

## 6. Contatti

support@aclearo.com`,
  termsBody: `# Termini di utilizzo di Aclearo

${LEGAL_REVIEW_IT}

**Data di entrata in vigore:** 4 luglio 2026

## 1. Accettazione

Usando l’app accetti i presenti Termini e l’Informativa sulla privacy di Aclearo.

## 2. Scopo

L’app è destinata al monitoraggio personale delle allergie e a un controllo preliminare degli ingredienti. Le informazioni sono indicative.

## 3. Responsabilità

I risultati dello scanner possono contenere errori. In emergenza chiama il numero di emergenza locale.

## 4. Account

Puoi eliminare l’account e tutti i dati in qualsiasi momento.

## 5. Contatti

support@aclearo.com`,
};

const DOCS: Record<AppLocale, LegalDocs> = {
  ru: RU,
  en: EN,
  es: ES,
  fr: FR,
  de: DE,
  it: IT,
};

export function getLegalDocs(locale: AppLocale): LegalDocs {
  return DOCS[locale] ?? EN;
}
