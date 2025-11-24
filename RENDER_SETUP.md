# Настройка переменных окружения на Render.com

## Шаги для настройки DATABASE_URL на Render

1. Зайдите на [Render.com](https://render.com) и откройте ваш бэкенд сервис
2. Перейдите в раздел **Environment** (Переменные окружения)
3. Добавьте или обновите переменную:

   **Key:** `DATABASE_URL`
   
   **Value:** 
   ```
   postgresql://my_free_postgres_db_0fz9_user:QcsRs53pt0OEGM6tfXFCO24hO3ohdSXi@dpg-d4heehn5r7bs73bq6ag0-a/my_free_postgres_db_0fz9?sslmode=require
   ```

4. Нажмите **Save Changes**
5. Render автоматически перезапустит сервис

## Важно

- Используйте **Internal Database URL** (без домена `.frankfurt-postgres.render.com`)
- Обязательно добавьте `?sslmode=require` в конце URL
- После сохранения сервис перезапустится автоматически

## Проверка

После перезапуска проверьте логи сервиса. Вы должны увидеть:
```
[INFO] Database connection configured
databaseType: 'PostgreSQL'
```

Если видите ошибки подключения, проверьте:
- Правильность DATABASE_URL
- Наличие `?sslmode=require`
- Что база данных активна на Render

