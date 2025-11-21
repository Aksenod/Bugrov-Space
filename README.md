<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This repo now contains:

- **frontend** (Vite + React) — `/`
- **backend API** (Express + Prisma + SQLite) — `/backend`

Frontend talks to the backend API on Render for auth, chat history, files and GPT calls.

## Prerequisites

- Node.js 18+
- npm 10+

## Environment variables

### Backend (`backend/.env`)

```bash
PORT=4000
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY=your_openai_key
JWT_SECRET=some_long_secret
```

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

The backend ships with Prisma + SQLite. Generate the client and run migrations:

```bash
cd backend
npx prisma migrate deploy
```

## Deploy

### Backend (Render)

Backend автоматически деплоится на Render при пуше в репозиторий.

Сервис: `https://bugrov-space.onrender.com`

### Frontend (GitHub Pages)

```bash
npm run deploy
```

Фронтенд доступен на: `https://bugrov.space`
