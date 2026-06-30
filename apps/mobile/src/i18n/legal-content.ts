import type { AppLocale } from '@/src/i18n/types';

export type LegalDocuments = {
  privacyTitle: string;
  privacyBody: string;
  termsTitle: string;
  termsBody: string;
};

const EFFECTIVE_DATE = '20 June 2026';

const ru: LegalDocuments = {
  privacyTitle: 'Политика конфиденциальности',
  privacyBody: `# Политика конфиденциальности AllerGuide

**Дата вступления в силу:** ${EFFECTIVE_DATE}

## 1. Общие положения

AllerGuide («Приложение») помогает пользователям вести дневник аллергии, хранить профили и получать предварительные рекомендации по продуктам. Мы относимся к вашим данным как к конфиденциальной информации о здоровье.

## 2. Какие данные мы обрабатываем

- **Учётная запись:** email или номер телефона.
- **Профили аллергии:** имя, год рождения, список аллергенов.
- **Дневник:** записи о симптомах, питании, лекарствах и контактах.
- **Экстренные контакты и SOS-заметки.**
- **История сканирований:** результаты проверки продуктов.

## 3. Где хранятся данные

По умолчанию все данные хранятся **локально на вашем устройстве** (SQLite на iOS/Android, IndexedDB в web-версии). Облачная резервная копия доступна только при включении соответствующей функции и авторизации на сервере.

## 4. Передача третьим лицам

- При сканировании штрихкода приложение может обращаться к **Open Food Facts** для получения состава продукта.
- При загрузке индекса самочувствия — к **Open-Meteo** (пыльца, качество воздуха).
- Мы не продаём персональные данные и не передаём их рекламным сетям.

## 5. Ваши права

Вы можете просматривать и редактировать данные в приложении, удалить отдельные профили и **удалить аккаунт** в разделе профиля.

## 6. Безопасность

Пароли хранятся в виде криптографического хеша (PBKDF2). Сессия на мобильных устройствах дополнительно сохраняется в защищённом хранилище ОС. Облачные резервные копии шифруются на устройстве перед отправкой.

## 7. Медицинский disclaimer

AllerGuide не является медицинским изделием и не заменяет консультацию врача.

## 8. Контакты

support@allerguide.app`,
  termsTitle: 'Условия использования',
  termsBody: `# Условия использования AllerGuide

**Дата вступления в силу:** ${EFFECTIVE_DATE}

## 1. Принятие условий

Используя AllerGuide, вы соглашаетесь с настоящими Условиями и Политикой конфиденциальности.

## 2. Назначение сервиса

Приложение предназначено для **личного учёта аллергии** и предварительной проверки состава продуктов. Информация носит справочный характер.

## 3. Ограничение ответственности

- Результаты сканера основаны на ключевых словах и открытых базах данных; возможны ошибки и пропуски аллергенов.
- Разработчик не несёт ответственности за решения, принятые на основе данных приложения.
- В экстренной ситуации звоните по номеру **103** (или локальному номеру экстренной помощи).

## 4. Аккаунт пользователя

Вы обязуетесь указывать достоверные данные и хранить пароль в безопасности. Вы можете удалить аккаунт в любой момент.

## 5. Запрещённое использование

Запрещается использовать приложение для противоправных целей, попыток взлома или автоматизированного сбора данных.

## 6. Изменения

Мы можем обновлять Условия. Актуальная версия доступна в приложении.

## 7. Контакты

support@allerguide.app`,
};

const en: LegalDocuments = {
  privacyTitle: 'Privacy policy',
  privacyBody: `# AllerGuide Privacy Policy

**Effective date:** ${EFFECTIVE_DATE}

## 1. Overview

AllerGuide ("the App") helps users keep an allergy diary, manage profiles, and receive preliminary product guidance. We treat your data as confidential health-related information.

## 2. Data we process

- **Account:** email or phone number.
- **Allergy profiles:** name, birth year, allergen list.
- **Diary:** symptom, food, medication, and contact entries.
- **Emergency contacts and SOS notes.**
- **Scan history:** product check results.

## 3. Where data is stored

By default, all data is stored **locally on your device** (SQLite on iOS/Android, IndexedDB on web). Cloud backup is available only when the feature is enabled and you are signed in to the server.

## 4. Third parties

- Barcode scans may query **Open Food Facts** for product composition.
- Wellness data may query **Open-Meteo** (pollen, air quality).
- We do not sell personal data or share it with ad networks.

## 5. Your rights

You can view and edit data in the app, delete individual profiles, and **delete your account** from the profile screen.

## 6. Security

Passwords are stored as cryptographic hashes (PBKDF2). Mobile sessions may use the OS secure store. Cloud backups are encrypted on the device before upload.

## 7. Medical disclaimer

AllerGuide is not a medical device and does not replace professional medical advice.

## 8. Contact

support@allerguide.app`,
  termsTitle: 'Terms of use',
  termsBody: `# AllerGuide Terms of Use

**Effective date:** ${EFFECTIVE_DATE}

## 1. Acceptance

By using AllerGuide you agree to these Terms and the Privacy Policy.

## 2. Purpose

The App is for **personal allergy tracking** and preliminary product checks. Information is provided for reference only.

## 3. Limitation of liability

- Scanner results rely on keywords and open databases; allergens may be missed or misclassified.
- The developer is not liable for decisions made based on App data.
- In an emergency, call your local emergency number (e.g. **112** in the EU).

## 4. Your account

Provide accurate information and keep your password secure. You may delete your account at any time.

## 5. Prohibited use

You may not use the App for unlawful purposes, hacking attempts, or automated data harvesting.

## 6. Changes

We may update these Terms. The current version is available in the App.

## 7. Contact

support@allerguide.app`,
};

const es: LegalDocuments = {
  privacyTitle: 'Política de privacidad',
  privacyBody: `# Política de privacidad de AllerGuide

**Fecha de entrada en vigor:** ${EFFECTIVE_DATE}

## 1. Generalidades

AllerGuide («la Aplicación») ayuda a llevar un diario de alergias, gestionar perfiles y obtener orientación preliminar sobre productos. Tratamos sus datos como información de salud confidencial.

## 2. Datos que procesamos

- **Cuenta:** correo electrónico o teléfono.
- **Perfiles de alergia:** nombre, año de nacimiento, alérgenos.
- **Diario:** síntomas, alimentación, medicación y contactos.
- **Contactos de emergencia y notas SOS.**
- **Historial de escaneos.**

## 3. Dónde se almacenan los datos

Por defecto, todos los datos se guardan **localmente en su dispositivo** (SQLite en iOS/Android, IndexedDB en web). La copia en la nube solo está disponible si activa la función e inicia sesión en el servidor.

## 4. Terceros

- Los escaneos de código de barras pueden consultar **Open Food Facts**.
- El índice de bienestar puede consultar **Open-Meteo** (polen, calidad del aire).
- No vendemos datos personales ni los compartimos con redes publicitarias.

## 5. Sus derechos

Puede ver y editar datos, eliminar perfiles y **eliminar su cuenta** desde el perfil.

## 6. Seguridad

Las contraseñas se almacenan como hash criptográfico (PBKDF2). Las copias en la nube se cifran en el dispositivo antes de subirlas.

## 7. Aviso médico

AllerGuide no es un dispositivo médico ni sustituye el consejo profesional.

## 8. Contacto

support@allerguide.app`,
  termsTitle: 'Términos de uso',
  termsBody: `# Términos de uso de AllerGuide

**Fecha de entrada en vigor:** ${EFFECTIVE_DATE}

## 1. Aceptación

Al usar AllerGuide acepta estos Términos y la Política de privacidad.

## 2. Finalidad

La Aplicación es para **seguimiento personal de alergias** y comprobaciones preliminares de productos.

## 3. Limitación de responsabilidad

- Los resultados del escáner pueden contener errores u omisiones.
- El desarrollador no es responsable de decisiones basadas en la Aplicación.
- En emergencias, llame al número local de emergencias.

## 4. Cuenta

Proporcione datos veraces y proteja su contraseña. Puede eliminar su cuenta en cualquier momento.

## 5. Uso prohibido

No utilice la Aplicación con fines ilícitos ni para recopilación automatizada de datos.

## 6. Cambios

Podemos actualizar estos Términos. La versión actual está en la Aplicación.

## 7. Contacto

support@allerguide.app`,
};

const fr: LegalDocuments = {
  privacyTitle: 'Politique de confidentialité',
  privacyBody: `# Politique de confidentialité AllerGuide

**Date d'entrée en vigueur :** ${EFFECTIVE_DATE}

## 1. Aperçu

AllerGuide (« l'Application ») aide à tenir un journal d'allergie, gérer des profils et obtenir des indications préliminaires sur les produits. Nous traitons vos données comme des informations de santé confidentielles.

## 2. Données traitées

- **Compte :** e-mail ou téléphone.
- **Profils d'allergie :** nom, année de naissance, allergènes.
- **Journal :** symptômes, alimentation, médicaments, contacts.
- **Contacts d'urgence et notes SOS.**
- **Historique des scans.**

## 3. Stockage

Par défaut, toutes les données sont stockées **localement sur votre appareil** (SQLite sur iOS/Android, IndexedDB sur le web). La sauvegarde cloud n'est disponible que si la fonction est activée et que vous êtes connecté au serveur.

## 4. Tiers

- Les scans peuvent interroger **Open Food Facts**.
- Le bien-être peut interroger **Open-Meteo** (pollen, qualité de l'air).
- Nous ne vendons pas vos données personnelles.

## 5. Vos droits

Vous pouvez consulter, modifier, supprimer des profils et **supprimer votre compte** depuis le profil.

## 6. Sécurité

Mots de passe hachés (PBKDF2). Sauvegardes cloud chiffrées sur l'appareil avant envoi.

## 7. Avertissement médical

AllerGuide n'est pas un dispositif médical et ne remplace pas un avis médical.

## 8. Contact

support@allerguide.app`,
  termsTitle: "Conditions d'utilisation",
  termsBody: `# Conditions d'utilisation AllerGuide

**Date d'entrée en vigueur :** ${EFFECTIVE_DATE}

## 1. Acceptation

En utilisant AllerGuide, vous acceptez ces Conditions et la Politique de confidentialité.

## 2. Objet

L'Application sert au **suivi personnel des allergies** et aux vérifications préliminaires de produits.

## 3. Responsabilité

- Les résultats du scanner peuvent être incomplets ou erronés.
- Le développeur n'est pas responsable des décisions prises sur la base de l'Application.
- En urgence, appelez le numéro d'urgence local.

## 4. Compte

Fournissez des informations exactes et protégez votre mot de passe. Vous pouvez supprimer votre compte à tout moment.

## 5. Usage interdit

Usage illicite, piratage ou collecte automatisée interdits.

## 6. Modifications

Nous pouvons mettre à jour ces Conditions. La version actuelle est dans l'Application.

## 7. Contact

support@allerguide.app`,
};

const de: LegalDocuments = {
  privacyTitle: 'Datenschutz',
  privacyBody: `# AllerGuide Datenschutzerklärung

**Gültig ab:** ${EFFECTIVE_DATE}

## 1. Überblick

AllerGuide („die App“) unterstützt ein Allergietagebuch, Profile und vorläufige Produkt-Hinweise. Wir behandeln Ihre Daten als vertrauliche Gesundheitsinformationen.

## 2. Verarbeitete Daten

- **Konto:** E-Mail oder Telefonnummer.
- **Allergieprofile:** Name, Geburtsjahr, Allergene.
- **Tagebuch:** Symptome, Ernährung, Medikamente, Kontakte.
- **Notfallkontakte und SOS-Notizen.**
- **Scan-Verlauf.**

## 3. Speicherung

Standardmäßig werden alle Daten **lokal auf Ihrem Gerät** gespeichert (SQLite auf iOS/Android, IndexedDB im Web). Cloud-Backup nur bei aktivierter Funktion und Server-Anmeldung.

## 4. Drittanbieter

- Barcode-Scans können **Open Food Facts** abfragen.
- Wellness kann **Open-Meteo** (Pollen, Luftqualität) abfragen.
- Wir verkaufen keine personenbezogenen Daten.

## 5. Ihre Rechte

Sie können Daten einsehen, bearbeiten, Profile löschen und Ihr **Konto im Profil löschen**.

## 6. Sicherheit

Passwörter als Hash (PBKDF2). Cloud-Backups werden auf dem Gerät verschlüsselt.

## 7. Medizinischer Hinweis

AllerGuide ist kein Medizinprodukt und ersetzt keine ärztliche Beratung.

## 8. Kontakt

support@allerguide.app`,
  termsTitle: 'Nutzungsbedingungen',
  termsBody: `# AllerGuide Nutzungsbedingungen

**Gültig ab:** ${EFFECTIVE_DATE}

## 1. Annahme

Mit der Nutzung von AllerGuide akzeptieren Sie diese Bedingungen und die Datenschutzerklärung.

## 2. Zweck

Die App dient der **persönlichen Allergie-Dokumentation** und vorläufigen Produktprüfung.

## 3. Haftung

- Scanner-Ergebnisse können unvollständig oder fehlerhaft sein.
- Der Entwickler haftet nicht für Entscheidungen auf Basis der App.
- Im Notfall rufen Sie die örtliche Notrufnummer an.

## 4. Konto

Geben Sie korrekte Daten an und schützen Sie Ihr Passwort. Konto kann jederzeit gelöscht werden.

## 5. Verbotene Nutzung

Keine rechtswidrige Nutzung, Hacking oder automatisierte Datenerfassung.

## 6. Änderungen

Wir können diese Bedingungen aktualisieren. Die aktuelle Version ist in der App verfügbar.

## 7. Kontakt

support@allerguide.app`,
};

const it: LegalDocuments = {
  privacyTitle: 'Privacy policy',
  privacyBody: `# Informativa sulla privacy AllerGuide

**Data di entrata in vigore:** ${EFFECTIVE_DATE}

## 1. Panoramica

AllerGuide («l'App») aiuta a tenere un diario delle allergie, gestire profili e ottenere indicazioni preliminari sui prodotti. Trattiamo i tuoi dati come informazioni sanitarie riservate.

## 2. Dati trattati

- **Account:** email o telefono.
- **Profili allergia:** nome, anno di nascita, allergeni.
- **Diario:** sintomi, alimentazione, farmaci, contatti.
- **Contatti di emergenza e note SOS.**
- **Cronologia scansioni.**

## 3. Dove sono archiviati i dati

Per impostazione predefinita, tutti i dati sono salvati **localmente sul dispositivo** (SQLite su iOS/Android, IndexedDB sul web). Il backup cloud è disponibile solo se la funzione è attiva e sei connesso al server.

## 4. Terze parti

- Le scansioni possono interrogare **Open Food Facts**.
- Il benessere può interrogare **Open-Meteo** (polline, qualità dell'aria).
- Non vendiamo dati personali.

## 5. I tuoi diritti

Puoi visualizzare, modificare, eliminare profili e **eliminare l'account** dal profilo.

## 6. Sicurezza

Password memorizzate come hash (PBKDF2). Backup cloud crittografati sul dispositivo prima dell'invio.

## 7. Avviso medico

AllerGuide non è un dispositivo medico e non sostituisce il parere medico.

## 8. Contatto

support@allerguide.app`,
  termsTitle: 'Termini di utilizzo',
  termsBody: `# Termini di utilizzo AllerGuide

**Data di entrata in vigore:** ${EFFECTIVE_DATE}

## 1. Accettazione

Usando AllerGuide accetti questi Termini e l'Informativa sulla privacy.

## 2. Scopo

L'App è per il **monitoraggio personale delle allergie** e controlli preliminari dei prodotti.

## 3. Responsabilità

- I risultati dello scanner possono essere incompleti o errati.
- Lo sviluppatore non è responsabile delle decisioni basate sull'App.
- In emergenza, chiama il numero di emergenza locale.

## 4. Account

Fornisci dati accurati e proteggi la password. Puoi eliminare l'account in qualsiasi momento.

## 5. Uso vietato

Vietato l'uso illecito, hacking o raccolta automatizzata di dati.

## 6. Modifiche

Possiamo aggiornare questi Termini. La versione attuale è nell'App.

## 7. Contatto

support@allerguide.app`,
};

export const LEGAL_BY_LOCALE: Record<AppLocale, LegalDocuments> = {
  ru,
  en,
  es,
  fr,
  de,
  it,
};

export function getLegalDocuments(locale: AppLocale): LegalDocuments {
  return LEGAL_BY_LOCALE[locale] ?? LEGAL_BY_LOCALE.ru;
}
