# Staging на Yandex Cloud — поэкранная инструкция (консоль)

Пошаговый гайд **через веб-консоль** (Cloud Center → Консоль): на каком экране, в какое поле, какое значение.

**Альтернатива:** Terraform — [`staging-yandex-cloud.md`](./staging-yandex-cloud.md) + `infra/yandex/staging/`.  
**Env API:** [`apps/api/.env.staging.example`](../apps/api/.env.staging.example).

> Подписи кнопок могут чуть отличаться (RU/EN), смысл полей тот же. Каталог: выберите folder staging (не cloud root).

---

## Перед стартом — что приготовить

| Что | Пример / команда |
|-----|------------------|
| Folder ID | Cloud Center → Консоль → сверху folder; ID вида `b1g…` |
| Пароль Postgres | `openssl rand -base64 24` |
| JWT / session | `openssl rand -hex 32` (два раза) |
| SSH public key | `~/.ssh/id_ed25519.pub` |
| Домены | `aclearo.com`, `aclearo.ru` (или только default `*.apigw.yandexcloud.net`) |
| OpenAI key | опционально; из РФ может не открываться |

Целевой URL: `https://api.staging.aclearo.com/api/health`

---

## Содержание

0. [Folder и биллинг](#0-folder-и-биллинг)
1. [IAM — сервисные аккаунты](#1-iam--сервисные-аккаунты)
2. [VPC — сеть, подсеть, SG](#2-vpc--сеть-подсеть-sg)
3. [Managed PostgreSQL](#3-managed-postgresql)
4. [Container Registry](#4-container-registry)
5. [Lockbox](#5-lockbox)
6. [Serverless Container](#6-serverless-container)
7. [Certificate Manager + Cloud DNS](#7-certificate-manager--cloud-dns)
8. [API Gateway](#8-api-gateway)
9. [Compute — VM для миграций](#9-compute--vm-для-миграций)
10. [Первый образ и revision](#10-первый-образ-и-revision)
11. [Миграции и smoke](#11-миграции-и-smoke)
12. [GitHub Secrets](#12-github-secrets)
13. [EAS mobile](#13-eas-mobile)

---

## 0. Folder и биллинг

1. Cloud Center → **Биллинг** — платёжный аккаунт активен.
2. **Консоль** → сверху выберите/создайте folder, напр. `aclearo-staging`.
3. Запишите **Folder ID**.

---

## 1. IAM — сервисные аккаунты

**Путь:** слева **Управление доступом** → **Сервисные аккаунты** → **Создать сервисный аккаунт**.

### 1.1. SA для контейнера API

| Поле | Значение |
|------|----------|
| Имя | `aclearo-staging-api` |
| Описание | `API container: pull images, Lockbox, VPC` |

После создания → вкладка **Назначить роли** (на уровне **folder**):

| Роль |
|------|
| `container-registry.images.puller` |
| `lockbox.payloadViewer` |
| `vpc.user` *(если нет — контейнер не войдёт в сеть)* |
| `serverless.containers.invoker` *(для вызова из API Gateway)* |

### 1.2. SA для деплоя (CI / ручной push)

| Поле | Значение |
|------|----------|
| Имя | `aclearo-staging-deploy` |

Роли на folder:

| Роль |
|------|
| `container-registry.images.pusher` |
| `serverless.containers.admin` |
| `lockbox.payloadViewer` |

### 1.3. Ключ для GitHub / docker login

Откройте `aclearo-staging-deploy` → **Создать новый ключ** → **Авторизованный ключ** → JSON:

| Поле | Значение |
|------|----------|
| Описание | `GitHub Actions YC_SA_JSON` |

Скачайте JSON → позже GitHub Secret `YC_SA_JSON`. **Ключ показывается один раз.**

---

## 2. VPC — сеть, подсеть, SG

**Путь:** Cloud Center → **Инфраструктура и сеть** → **Virtual Private Cloud**.

### 2.1. Сеть

**Создать сеть**

| Поле | Значение |
|------|----------|
| Имя | `aclearo-staging` |
| Создать подсети автоматически | **нет** (создадим сами) |

### 2.2. Подсеть

Сеть `aclearo-staging` → **Создать подсеть**

| Поле | Значение |
|------|----------|
| Имя | `aclearo-staging-subnet-a` |
| Зона доступности | `ru-central1-a` |
| CIDR | `10.128.0.0/24` |

### 2.3. Группа безопасности

VPC → **Группы безопасности** → **Создать**

| Поле | Значение |
|------|----------|
| Имя | `aclearo-staging-sg` |
| Сеть | `aclearo-staging` |

**Правила входящего трафика:**

| Приоритет | Протокол | Порт | Источник | Описание |
|-----------|----------|------|----------|----------|
| 1000 | TCP | `6432` | CIDR `10.128.0.0/24` | PostgreSQL из VPC |
| 1000 | TCP | `22` | ваш IP `/32` или временно `0.0.0.0/0` | SSH на runner |

**Исходящий:**

| Протокол | Назначение |
|----------|------------|
| Любой | `0.0.0.0/0` |

---

## 3. Managed PostgreSQL

**Путь:** **Платформа данных** → **Managed Service for PostgreSQL** → **Создать кластер**.

### 3.1. Основные параметры

| Поле | Значение |
|------|----------|
| Имя кластера | `aclearo-staging-pg` |
| Окружение | `Prestable` |
| Версия | `15` |
| Класс хоста | `s2.micro` (минимум для staging) |
| Размер хранилища | `20` ГБ |
| Тип диска | `network-ssd` |
| Сеть | `aclearo-staging` |
| Группы безопасности | `aclearo-staging-sg` |

### 3.2. Хост

| Поле | Значение |
|------|----------|
| Зона | `ru-central1-a` |
| Подсеть | `aclearo-staging-subnet-a` |
| **Публичный доступ** | **Выключен** |

### 3.3. База и пользователь

| Поле | Значение |
|------|----------|
| Имя БД | `aclearo_staging` |
| Владелец / пользователь | `aclearo` |
| Пароль | ваш `openssl rand -base64 24` |

Сохраните пароль в менеджере паролей.

### 3.4. После создания — connection string

Кластер → вкладка **Хосты** → скопируйте **FQDN** хоста (без публичного IP).

Соберите URL:

```text
postgresql://aclearo:ВАШ_ПАРОЛЬ@FQDN_ХОСТА:6432/aclearo_staging?sslmode=require
```

Для YC Managed PG обычно один host на `6432` (с SSL) — его же кладите в `DATABASE_URL` и `DIRECT_DATABASE_URL`.

---

## 4. Container Registry

**Путь:** **Инструменты DevOps** → **Container Registry** → **Создать реестр**.

| Поле | Значение |
|------|----------|
| Имя | `aclearo-staging-registry` |

После создания запишите **Registry ID** (`crp…`).  
URL образов: `cr.yandex/<REGISTRY_ID>/aclearo-api:staging`.

---

## 5. Lockbox

**Путь:** **Безопасность** → **Yandex Lockbox** → **Создать секрет**.

### 5.1. Метаданные

| Поле | Значение |
|------|----------|
| Имя | `aclearo-staging-api-env` |
| Описание | `Staging API env` |
| Защита от удаления | включить |

### 5.2. Версия — пары ключ / значение

Добавьте записи (тип **Текст**):

| Ключ | Значение |
|------|----------|
| `DATABASE_URL` | `postgresql://aclearo:…@FQDN:6432/aclearo_staging?sslmode=require` |
| `DIRECT_DATABASE_URL` | то же |
| `DB_SSL` | `require` |
| `DB_PREPARE` | `false` |
| `API_PORT` | `3001` |
| `JWT_SECRET` | вывод `openssl rand -hex 32` |
| `SESSION_SECRET` | другой `openssl rand -hex 32` |
| `SYNC_ENABLED` | `true` |
| `AI_SCAN_ENABLED` | `true` или `false` (если OpenAI недоступен из РФ) |
| `SCAN_REQUIRE_AUTH` | `true` |
| `SCAN_DAILY_BUDGET` | `50` |
| `CORS_ORIGINS` | `http://localhost:5000,http://127.0.0.1:5000,https://staging.aclearo.com,https://staging.aclearo.ru,https://aclearo.com,https://aclearo.ru` |
| `PRODUCT_OFF_FALLBACK` | `true` |
| `OPENFOODFACTS_USER_AGENT` | `A-Claro/1.0-staging (support@aclearo.com)` |
| `RATE_LIMIT_DISABLED` | `false` |
| `OPENAI_API_KEY` | `sk-…` (если AI включён) |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` (или URL прокси) |
| `OPENAI_MODEL` | `gpt-4o-mini` |

**Не добавляйте** `METRO_URL`.

Запишите **Secret ID** (`e6q…`).

Выдайте доступ: Lockbox → секрет → **Права доступа** → добавить `aclearo-staging-api` и `aclearo-staging-deploy` с ролью `lockbox.payloadViewer` (если ещё не через folder IAM).

---

## 6. Serverless Container

**Путь:** поиск «Serverless Containers» / **Serverless** → **Контейнеры** → **Создать контейнер**.

> На этом шаге достаточно **создать контейнер** (оболочку). Ревизию с образом — после push в Registry (§10).

### 6.1. Создать контейнер

| Поле | Значение |
|------|----------|
| Имя | `aclearo-staging-api` |
| Описание | `Aclearo staging API` |
| Сервисный аккаунт | `aclearo-staging-api` |

### 6.2. Сеть (connectivity)

| Поле | Значение |
|------|----------|
| Сеть | `aclearo-staging` |
| Подсети | `aclearo-staging-subnet-a` |

Без VPC container **не достучится** до private Postgres.

Запишите **Container ID**.

---

## 7. Certificate Manager + Cloud DNS

Пропустите, если пока хватает default-домена `*.apigw.yandexcloud.net`.

### 7.1. Сертификат

**Безопасность** → **Certificate Manager** → **Добавить сертификат** → тип **Let's Encrypt** (управляемый).

| Поле | Значение |
|------|----------|
| Имя | `aclearo-api-staging` |
| Домены | `api.staging.aclearo.com` и при необходимости `api.staging.aclearo.ru` |
| Тип проверки | **DNS** (CNAME) |

### 7.2. DNS-зона

**Инфраструктура и сеть** → **Cloud DNS** → **Создать DNS-зону**

| Поле | Значение |
|------|----------|
| Тип | Публичная |
| Имя зоны | `aclearo-com` (любое) |
| Домен | `aclearo.com.` |

У регистратора домена пропишите NS из Cloud DNS.

### 7.3. Challenge-записи

Certificate Manager → сертификат → скопируйте **CNAME** challenge → в зоне `aclearo.com` создайте те же записи.

Ждите статус **Issued** / **Выпущен**.

---

## 8. API Gateway

**Путь:** поиск «API Gateway» → **Создать API-шлюз**.

### 8.1. Основные

| Поле | Значение |
|------|----------|
| Имя | `aclearo-staging-api-gw` |
| Описание | `Public HTTPS → staging API` |

### 8.2. Спецификация (OpenAPI)

Вставьте (подставьте свой `CONTAINER_ID` и ID SA `aclearo-staging-api`):

```yaml
openapi: 3.0.0
info:
  title: aclearo-staging-api
  version: 1.0.0
paths:
  /{proxy+}:
    parameters:
      - name: proxy
        in: path
        required: false
        schema:
          type: string
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: serverless_containers
        container_id: ВАШ_CONTAINER_ID
        service_account_id: ВАШ_SA_API_ID
  /:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: serverless_containers
        container_id: ВАШ_CONTAINER_ID
        service_account_id: ВАШ_SA_API_ID
```

Создайте шлюз → скопируйте **домен по умолчанию** вида `…apigw.yandexcloud.net`.

### 8.3. Свой домен (после Issued)

API Gateway → шлюз → **Домены** → **Добавить домен**:

| Поле | Значение |
|------|----------|
| Домен | `api.staging.aclearo.com` |
| Сертификат | `aclearo-api-staging` |

Cloud DNS → зона `aclearo.com` → запись:

| Имя | Тип | Значение |
|-----|-----|----------|
| `api.staging` | CNAME | default domain API Gateway |

Аналогично для `.ru`, если нужно.

---

## 9. Compute — VM для миграций

**Путь:** **Инфраструктура и сеть** → **Compute Cloud** → **Создать ВМ**.

| Поле | Значение |
|------|----------|
| Имя | `aclearo-staging-gh-runner` |
| Зона | `ru-central1-a` |
| Платформа | Intel Cascade Lake / Ice Lake (`standard-v3`) |
| vCPU | `2` |
| RAM | `4` ГБ |
| Образ | Ubuntu 22.04 LTS |
| Диск | `30` ГБ, `network-ssd` |
| Сеть | `aclearo-staging` |
| Подсеть | `aclearo-staging-subnet-a` |
| Публичный адрес | **Автоматически** (NAT) |
| Группы безопасности | `aclearo-staging-sg` |
| Логин | `ubuntu` |
| SSH-ключ | содержимое `id_ed25519.pub` |

После создания запишите **публичный IP**.

```bash
ssh ubuntu@ПУБЛИЧНЫЙ_IP
```

На VM (минимум для миграций):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo corepack enable
sudo corepack prepare pnpm@10.34.4 --activate
```

Опционально — self-hosted runner с label `yc-staging-vpc` (см. [`staging-yandex-cloud.md`](./staging-yandex-cloud.md) §5).

---

## 10. Первый образ и revision

На машине с Docker (или с runner VM, если там Docker):

```bash
# из корня репозитория
echo "$YC_SA_JSON" | docker login --username json_key --password-stdin cr.yandex

docker build -t "cr.yandex/<REGISTRY_ID>/aclearo-api:staging" .
docker push "cr.yandex/<REGISTRY_ID>/aclearo-api:staging"
```

### 10.1. Ревизия в консоли

**Serverless Containers** → `aclearo-staging-api` → **Добавить ревизию** / **Развернуть ревизию**:

| Поле | Значение |
|------|----------|
| Образ | `cr.yandex/<REGISTRY_ID>/aclearo-api:staging` |
| Сервисный аккаунт | `aclearo-staging-api` |
| Память | `512` МБ |
| vCPU | `1` |
| Таймаут | `30` с |
| Порт приложения | `3001` |
| Сеть / подсеть | как в §6 |

**Переменные окружения** → добавить из Lockbox (не plaintext):

| Переменная окружения | Секрет Lockbox | Ключ |
|----------------------|----------------|------|
| `DATABASE_URL` | `aclearo-staging-api-env` | `DATABASE_URL` |
| `DIRECT_DATABASE_URL` | … | `DIRECT_DATABASE_URL` |
| `JWT_SECRET` | … | `JWT_SECRET` |
| `SESSION_SECRET` | … | `SESSION_SECRET` |
| `DB_SSL` | … | `DB_SSL` |
| `SYNC_ENABLED` | … | `SYNC_ENABLED` |
| `AI_SCAN_ENABLED` | … | `AI_SCAN_ENABLED` |
| `CORS_ORIGINS` | … | `CORS_ORIGINS` |
| … | остальные ключи из §5 | … |

Сохраните / задеплойте ревизию.

---

## 11. Миграции и smoke

На runner VM (в VPC):

```bash
git clone <ваш-репо> && cd AllerGuide   # или scp / checkout
pnpm install --frozen-lockfile

export DATABASE_URL='postgresql://aclearo:…@FQDN:6432/aclearo_staging?sslmode=require'
export DIRECT_DATABASE_URL="$DATABASE_URL"
export DB_SSL=require

./scripts/staging-migrate.sh
# опционально:
# pnpm --filter api db:seed-allergens
```

Проверка с любого ПК:

```bash
# пока без своего домена:
curl -sf "https://ВАШ_DEFAULT.apigw.yandexcloud.net/api/health" | jq .

# после DNS:
curl -sf https://api.staging.aclearo.com/api/health | jq .
```

Ожидание: `"ok": true`, `"database": { "ok": true }`, `"authDatabase": true`.

Полный preflight:

```bash
export STAGING_API_URL=https://api.staging.aclearo.com
./scripts/staging-preflight.sh
```

---

## 12. GitHub Secrets

GitHub → репозиторий → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret | Откуда взять |
|--------|----------------|
| `YC_SA_JSON` | весь JSON ключа SA `aclearo-staging-deploy` |
| `YC_REGISTRY_ID` | ID реестра |
| `YC_CONTAINER_ID` | ID Serverless Container |
| `YC_LOCKBOX_SECRET_ID` | ID секрета Lockbox |
| `STAGING_DATABASE_URL` | connection string |
| `STAGING_DIRECT_DATABASE_URL` | то же |
| `STAGING_API_URL` | `https://api.staging.aclearo.com` |
| `EXPO_TOKEN` | expo.dev → Access Tokens |

Дальше push в ветку `staging` → workflow `deploy-staging-yandex.yml`.

---

## 13. EAS mobile

После зелёного health:

```bash
cd apps/mobile
pnpm build:staging:android
# pnpm build:staging:ios
```

Profile `staging` уже использует `EXPO_PUBLIC_API_URL=https://api.staging.aclearo.com`.

---

## Чеклист «все экраны пройдены»

- [ ] SA `aclearo-staging-api` + `aclearo-staging-deploy` + JSON-ключ
- [ ] VPC `aclearo-staging`, subnet `10.128.0.0/24`, SG 6432/22
- [ ] PG `aclearo-staging-pg`, БД `aclearo_staging`, **без public IP**
- [ ] Registry + Lockbox заполнен
- [ ] Serverless Container + VPC + ревизия с образом и секретами
- [ ] API Gateway + (опц.) сертификат и CNAME
- [ ] VM runner + `db:migrate`
- [ ] `curl …/api/health` → 200
- [ ] GitHub Secrets + EAS staging

---

## Типичные ошибки на экранах

| Где | Симптом | Что проверить |
|-----|---------|---------------|
| PostgreSQL | «Публичный доступ» включён | Выключить; URL только из VPC |
| Serverless Container | `database.ok: false` | VPC connectivity + Lockbox `DATABASE_URL` + SG 6432 |
| Lockbox | контейнер не читает секреты | роль `lockbox.payloadViewer` у SA API |
| API Gateway | 403/502 | `container_id` / `service_account_id` в OpenAPI; ревизия Active |
| Certificate | не Issued | CNAME challenge в Cloud DNS; NS у регистратора |
| Compute | migrate connection refused | VM в той же subnet; SG; FQDN:6432 |
| Docker login | unauthorized | JSON ключ именно **deploy** SA |

---

## Связанные документы

| Документ | Тема |
|----------|------|
| [`staging-yandex-cloud.md`](./staging-yandex-cloud.md) | Terraform + CI runbook |
| [`staging-deploy.md`](./staging-deploy.md) | общий staging (Neon / Railway) |
| [`eas-staging-build.md`](./eas-staging-build.md) | mobile staging |
| [`apps/api/.env.staging.example`](../apps/api/.env.staging.example) | полный список env |
