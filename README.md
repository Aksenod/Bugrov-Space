<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>
 

# Run and deploy your AI Studio app

This repo now contains:

- **frontend** (Vite + React) — `/`
- **backend API** (Express + Prisma + PostgreSQL) — `/backend`

Frontend talks to the backend API on Render for auth, chat history, files and GPT calls.

## Prerequisites

- Node.js 18+
- npm 10+

## Environment variables

### Backend (`backend/.env`)

```bash
PORT=4000
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
OPENAI_API_KEY=your_openai_key
JWT_SECRET=some_long_secret
CORS_ORIGIN=https://bugrov.space
```

**Важно для PostgreSQL:**
- Для локальной разработки используйте **External Database URL** (с полным доменом)
- Для продакшена на Render используйте **Internal Database URL** (без домена, только хост)
- Оба URL должны содержать `?sslmode=require` для SSL подключения к Render.com

Use `cp backend/env.example backend/.env` as a starting point and fill in your values.

### Frontend

Фронтенд использует продакшен бэкенд на Render по умолчанию:
```
VITE_API_URL=https://bugrov-space.onrender.com/api
```

Это настроено в `services/api.ts` и не требует дополнительной конфигурации.

## Install dependencies

```bash
# frontend
npm install

# backend
cd backend && npm install
```

## Database

The backend uses Prisma + PostgreSQL. Generate the client and run migrations:

```bash
cd backend
# Установить зависимости (если еще не установлены)
npm install

# Сгенерировать Prisma Client
npx prisma generate

# Применить миграции
npx prisma migrate deploy
```

**Требования:**
- PostgreSQL 12+ (тестировано на PostgreSQL 18.1)
- SSL подключение требуется для Render.com (`?sslmode=require`)

**Структура базы данных:**
- User - пользователи
- ProjectType - типы проектов
- Project - проекты
- Agent - агенты
- Message - сообщения
- File - файлы

## Роли и права доступа

- Создание, изменение и удаление **типов проектов** доступны только авторизованным администраторам. Перед обращением к `POST/PUT/DELETE /project-types` необходимо пройти аутентификацию и иметь роль `admin` (или имя пользователя `admin`).
- Файлы базы знаний шаблонов (ProjectTypeAgent) привязаны к полю `projectTypeAgentId` в таблице `File`. Пользовательские агенты получают доступ к этим данным только после создания экземпляра агента внутри конкретного проекта (при первом запросе к чату).
- Файлы проекта (samмари, документы) остаются привязанными к реальным `Agent` экземплярам и доступны через обычные `/agents/:agentId` и `/projects/:projectId` маршруты.

### Базовая логика проектов и агентов

**Администратор:**

- Создает типы проектов и шаблонных агентов (ProjectTypeAgent), прикрепляя их к нужным типам и задавая порядок.
- Управляет промптами (`systemInstruction`, `summaryInstruction`), моделями, ролями и базой знаний шаблонов (файлы с `projectTypeAgentId`).
- Любые изменения шаблонов автоматически синхронизируются со всеми проектами соответствующего типа (добавление/удаление агента, изменение промптов, обновление базы знаний).

**Пользователь:**

- Может зарегистрироваться, восстановить пароль и войти в систему.
- Создает проекты с произвольным названием, обязательно выбирая тип проекта из списка, который настроил админ.
- В момент создания проекта автоматически получает **готовых агентов** в той же последовательности и с теми же промптами/файлами, что и у администратора для выбранного типа.
- Пользуется агентами через чат, может генерировать summary, просматривать/скачивать/удалять документы проекта (summary и пользовательские файлы).
- Не может создавать, переименовывать, удалять или переупорядочивать агентов и не может добавлять им базу знаний — все настройки агентов выполняет администратор.

Таким образом, проект всегда содержит актуальный список админских агентов, а пользователь управляет только собственными документами внутри проекта.

## Deploy

### Backend (Render)

Backend автоматически деплоится на Render при пуше в репозиторий.

Сервис: `https://bugrov-space.onrender.com`

**Важно:** После миграции на PostgreSQL необходимо настроить переменную окружения `DATABASE_URL` на Render:
1. Откройте настройки сервиса на Render.com
2. Перейдите в раздел **Environment**
3. Добавьте переменную `DATABASE_URL` со значением Internal Database URL (см. `RENDER_SETUP.md`)

Подробные инструкции: см. файл `RENDER_SETUP.md`

### Frontend (GitHub Pages)

```bash
npm run deploy
```

Фронтенд доступен на: `https://bugrov.space`

