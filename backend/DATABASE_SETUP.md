# Настройка баз данных (dev и prod)

## Общий принцип

- Для **продакшна** всегда используется **одна постоянная БД** (PostgreSQL на Render) с фиксированным `DATABASE_URL`. Ее **нельзя менять** без осознанной миграции данных.
- Для **локальной разработки** и экспериментов используется **отдельная dev-БД** (локальный Postgres или External URL Render). Локальный код никогда не должен ходить в прод-БД.

Если вы видите ошибку `Can't reach database server` или `500 Internal Server Error` при попытке логина, это означает, что текущая БД недоступна или `DATABASE_URL` настроен неправильно.

## Локальная dev-база (безопасно)

### Вариант 1: Использовать локальную PostgreSQL базу данных

1. Установите PostgreSQL локально (если еще не установлен):
   ```bash
   # macOS
   brew install postgresql@15
   brew services start postgresql@15
   
   # Linux (Ubuntu/Debian)
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. Создайте базу данных:
   ```bash
   createdb bugrov_space_dev
   ```

3. Обновите `backend/.env`:
   ```bash
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bugrov_space_dev"
   ```

4. Примените миграции:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

### Вариант 2: Использовать External Database URL от Render (dev)

Если вы используете базу данных на Render как dev-БД:

1. Откройте настройки вашей базы данных на Render.com
2. Найдите **External Database URL** (не Internal!)
3. Обновите `backend/.env`:
   ```bash
   DATABASE_URL="postgresql://user:password@external-host:5432/database?sslmode=require"
   ```

4. Убедитесь, что URL содержит `?sslmode=require`

### Проверка подключения

После настройки проверьте подключение:
```bash
cd backend
npm run test:db
```

Или вручную:
```bash
cd backend
npx prisma migrate status
```

Если команда выполняется без ошибок, база данных настроена правильно.

## Важно

- **Internal Database URL** (Render) используется только прод-сервисом бекенда. Это «главная» база с реальными пользователями. Ее URL задается в `Environment` сервиса по инструкции из `RENDER_SETUP.md` и больше не меняется.
- **External Database URL** (Render) или локальный Postgres используются только для локальной разработки и тестов, через `backend/.env`.
- Оба URL должны содержать `?sslmode=require` для SSL подключения.

Никогда не запускайте на прод-БД команды вроде `prisma migrate reset` или скрипты, которые дропают таблицы/чистят данные. На проде мы используем только `prisma migrate deploy` (см. `backend/package.json`), который аккуратно применяет миграции к существующей схеме без удаления данных.

