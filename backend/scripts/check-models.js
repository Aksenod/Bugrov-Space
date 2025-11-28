#!/usr/bin/env node
/**
 * Скрипт для проверки доступных моделей OpenAI API
 * Использование: node backend/scripts/check-models.js
 */

const { fetch } = require('undici');

async function checkAvailableModels() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY не установлен');
    console.log('\nИспользование:');
    console.log('  OPENAI_API_KEY=your_key node backend/scripts/check-models.js');
    process.exit(1);
  }

  console.log('🔍 Проверка доступных моделей OpenAI...\n');
  console.log(`API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}\n`);

  try {
    // Получаем список всех доступных моделей
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ Ошибка при получении списка моделей:');
      console.error(`   Статус: ${response.status} ${response.statusText}`);
      if (errorData) {
        console.error(`   Детали: ${JSON.stringify(errorData, null, 2)}`);
      }
      process.exit(1);
    }

    const data = await response.json();

    // Фильтруем GPT модели
    const gptModels = data.data
      .filter(model => model.id.includes('gpt'))
      .sort((a, b) => a.id.localeCompare(b.id));

    console.log(`✅ Найдено ${gptModels.length} GPT моделей:\n`);

    gptModels.forEach(model => {
      console.log(`  • ${model.id}`);
    });

    console.log('\n📋 Проверка моделей из проекта:');
    const projectModels = ['gpt-5.1', 'gpt-5-mini', 'gpt-4o', 'gpt-4o-mini'];

    for (const modelName of projectModels) {
      const available = gptModels.some(m => m.id === modelName);
      const status = available ? '✅' : '❌';
      console.log(`  ${status} ${modelName}`);
    }

    console.log('\n💡 Рекомендации:');
    if (!gptModels.some(m => m.id.includes('gpt-5'))) {
      console.log('  ⚠️  GPT-5 модели не найдены. Возможные причины:');
      console.log('     - API ключ не имеет доступа к GPT-5 (требуется специальный доступ)');
      console.log('     - GPT-5 еще не доступен для вашей организации');
      console.log('     - Используйте доступные модели: gpt-4o, gpt-4o-mini');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

// Тестируем конкретную модель
async function testModel(modelName) {
  const apiKey = process.env.OPENAI_API_KEY;

  console.log(`\n🧪 Тестирование модели: ${modelName}`);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'user', content: 'Hello!' }
        ],
        max_tokens: 10
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.log(`  ❌ Модель недоступна`);
      if (errorData?.error?.message) {
        console.log(`     Причина: ${errorData.error.message}`);
      }
      return false;
    }

    console.log(`  ✅ Модель работает`);
    return true;
  } catch (error) {
    console.log(`  ❌ Ошибка: ${error.message}`);
    return false;
  }
}

async function main() {
  await checkAvailableModels();

  console.log('\n🧪 Тестирование моделей из проекта...');
  const modelsToTest = ['gpt-4o', 'gpt-4o-mini', 'gpt-5.1', 'gpt-5-mini'];

  for (const model of modelsToTest) {
    await testModel(model);
  }
}

main().catch(console.error);
