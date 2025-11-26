# Настройка переменных окружения на Render.com

## Шаги для настройки DATABASE_URL на Render (prod)

1. Зайдите на [Render.com](https://render.com) и откройте ваш бэкенд сервис
2. Перейдите в раздел **Environment** (Переменные окружения)
3. ОДИН РАЗ добавьте или обновите переменную (это ваша постоянная прод-БД, дальше ее менять нельзя без миграции данных):

   **Key:** `DATABASE_URL`
   
   **Value (пример, замените на свой Internal Database URL):** 
   ```
   postgresql://my_free_postgres_db_0fz9_user:QcsRs53pt0OEGM6tfXFCO24hO3ohdSXi@dpg-d4heehn5r7bs73bq6ag0-a/my_free_postgres_db_0fz9?sslmode=require
   ```

4. Нажмите **Save Changes**
5. Render автоматически перезапустит сервис

## Важно

- Используйте **Internal Database URL** (без домена `.frankfurt-postgres.render.com`) — это прод-БД, в которой живут все реальные пользователи и проекты.
- Обязательно добавьте `?sslmode=require` в конце URL.
- После сохранения сервис перезапустится автоматически и будет использовать **эту же** базу на всех следующих деплоях.
- НЕ меняйте `DATABASE_URL` на этом сервисе при обычных обновлениях кода — иначе бекенд начнет смотреть на другую (пустую) базу, и пользователи «пропадут».

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

