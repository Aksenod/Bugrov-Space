#!/bin/bash

# Скрипт для проверки и исправления подписки пользователя
# Использование: ./fix_subscription.sh <username> <admin_token>

USERNAME=${1:-"max"}
ADMIN_TOKEN=${2}
API_URL="https://bugrov-space.onrender.com/api"

if [ -z "$ADMIN_TOKEN" ]; then
    echo "Ошибка: Необходимо указать токен администратора"
    echo "Использование: $0 <username> <admin_token>"
    exit 1
fi

echo "=== Проверка статуса пользователя '$USERNAME' ==="
echo ""

# Проверяем статус пользователя
RESPONSE=$(curl -s -X GET "$API_URL/admin/fix-subscription/check-user/$USERNAME" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json")

echo "Ответ сервера:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Проверяем, есть ли успешные платежи
HAS_SUCCEEDED=$(echo "$RESPONSE" | jq -r '.payments[]? | select(.status == "succeeded") | .id' 2>/dev/null)

if [ -z "$HAS_SUCCEEDED" ]; then
    echo "❌ У пользователя '$USERNAME' нет успешных платежей"
    exit 1
fi

echo "✅ Найден успешный платеж!"
echo ""
echo "=== Исправление подписки ==="
echo ""

# Исправляем подписку
FIX_RESPONSE=$(curl -s -X POST "$API_URL/admin/fix-subscription/fix-subscription" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"$USERNAME\"}")

echo "Ответ сервера:"
echo "$FIX_RESPONSE" | jq '.' 2>/dev/null || echo "$FIX_RESPONSE"
echo ""

# Проверяем результат
SUCCESS=$(echo "$FIX_RESPONSE" | jq -r '.success' 2>/dev/null)

if [ "$SUCCESS" = "true" ]; then
    echo "✅ Подписка успешно активирована!"
    echo ""
    echo "Пользователю '$USERNAME' нужно:"
    echo "1. Выйти из аккаунта"
    echo "2. Войти заново"
    echo "3. Проверить, что подписка активна"
else
    echo "❌ Не удалось активировать подписку"
    echo "Проверьте логи сервера для получения дополнительной информации"
fi
