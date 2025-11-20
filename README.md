<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This repo now contains:

- **frontend** (Vite + React) — `/`
- **backend API** (Express + Prisma + SQLite) — `/backend`

Frontend talks to the backend for auth, chat history, files and GPT calls, so you need both to run locally.

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

### Frontend (`.env.local`)

```
VITE_API_URL=http://localhost:4000/api
```

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

## Development

Run backend first:

```bash
cd backend
npm run dev
```

Then start the frontend in a second terminal:

```bash
npm run dev
```

Visit `http://localhost:5173` (or the port Vite prints) to use the app.
