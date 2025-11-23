# Настройка базы данных для локальной разработки

## Проблема
Если вы видите ошибку `Can't reach database server` или `500 Internal Server Error` при попытке логина, это означает, что база данных недоступна.

## Решение

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

### Вариант 2: Использовать External Database URL от Render

Если вы используете базу данных на Render:

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

- **Internal Database URL** работает только внутри сети Render (для продакшн сервера)
- **External Database URL** работает извне (для локальной разработки)
- Оба URL должны содержать `?sslmode=require` для SSL подключения

